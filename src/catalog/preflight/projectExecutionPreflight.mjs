import fs from 'node:fs';
import path from 'node:path';

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const requiredString = (value, label, failures) => {
  if (typeof value !== 'string' || !value.trim()) {
    failures.push(`${label} is required`);
    return null;
  }
  return value.trim();
};

const sourceIdsFromMaterialization = (plan, failures) => {
  const ids = plan?.origin?.mediaItemIds
    || (plan?.origin?.mediaItemId ? [plan.origin.mediaItemId] : []);
  if (!Array.isArray(ids) || !ids.length) {
    failures.push('approved materialization plan must contain Catalog media item ids');
    return [];
  }
  if (new Set(ids).size !== ids.length) failures.push('approved materialization source ids must be unique');
  return ids;
};

const sameSet = (left, right) => {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

const absolutePath = (value, label, failures) => {
  const text = requiredString(value, label, failures);
  if (!text) return null;
  if (!path.isAbsolute(text)) {
    failures.push(`${label} must be absolute`);
    return null;
  }
  return path.resolve(text);
};

const isInside = (child, parent) => {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

/**
 * Read-only gate between reviewed plans and a local production adapter.
 * It intentionally accepts no executor, downloader, or Work State writer.
 */
export const buildProjectExecutionPreflight = ({
  materializationPlan,
  acquisitionPlan,
  projectRoot,
  workspaceRoot,
} = {}) => {
  const failures = [];
  const warnings = [];
  const checks = [];
  const check = (id, status, detail) => checks.push({ id, status, detail });

  if (!isRecord(materializationPlan) || materializationPlan.kind !== 'project-materialization-plan') {
    failures.push('materializationPlan.kind must be project-materialization-plan');
    check('approved-materialization', 'fail', 'missing or wrong plan kind');
  } else if (materializationPlan.selection?.requiresReviewedSourceSet !== false
    || materializationPlan.review?.status !== 'approved'
    || materializationPlan.approval?.planId !== materializationPlan.planId) {
    failures.push('an approved materialization plan is required');
    check('approved-materialization', 'fail', 'plan is pending or approval metadata is incomplete');
  } else {
    check('approved-materialization', 'pass', materializationPlan.planId);
  }

  if (!isRecord(acquisitionPlan) || acquisitionPlan.kind !== 'acquisition-plan') {
    failures.push('acquisitionPlan.kind must be acquisition-plan');
    check('acquisition-plan', 'fail', 'missing or wrong plan kind');
  } else {
    if (acquisitionPlan.execution?.status !== 'not-executed') {
      failures.push('acquisition plan must remain not-executed before preflight');
    }
    if (acquisitionPlan.execution?.explicitApprovalRequired !== true) {
      failures.push('acquisition plan must require explicit approval');
    }
    if (!Array.isArray(acquisitionPlan.requests) || !acquisitionPlan.requests.length) {
      failures.push('acquisitionPlan.requests must be a non-empty array');
    }
    check(
      'acquisition-plan',
      acquisitionPlan.execution?.status === 'not-executed'
        && acquisitionPlan.execution?.explicitApprovalRequired === true
        && Array.isArray(acquisitionPlan.requests)
        && acquisitionPlan.requests.length > 0 ? 'pass' : 'fail',
      acquisitionPlan.planId || 'unidentified plan',
    );
  }

  const sourceIds = sourceIdsFromMaterialization(materializationPlan, failures);
  const requestIds = Array.isArray(acquisitionPlan?.requests)
    ? acquisitionPlan.requests.map((request) => request?.item?.id).filter((id) => typeof id === 'string')
    : [];
  if (materializationPlan && acquisitionPlan) {
    if (acquisitionPlan.origin?.materializationPlanId !== materializationPlan.planId) {
      failures.push('acquisition plan must bind to the approved materialization plan');
    }
    if (acquisitionPlan.selection?.materializationApproval?.projectId !== materializationPlan.project?.id) {
      failures.push('acquisition plan materialization approval project must match the Project');
    }
    if (!sameSet(sourceIds, requestIds)) {
      failures.push('acquisition request item ids must exactly match the approved materialization sources');
    }
    check(
      'source-selection-parity',
      acquisitionPlan.origin?.materializationPlanId === materializationPlan.planId
        && acquisitionPlan.selection?.materializationApproval?.projectId === materializationPlan.project?.id
        && sameSet(sourceIds, requestIds) ? 'pass' : 'fail',
      `${sourceIds.length} approved source(s), ${requestIds.length} acquisition request(s)`,
    );
  }

  const targetRoot = projectRoot || materializationPlan?.project?.root;
  const resolvedWorkspace = absolutePath(workspaceRoot, 'workspaceRoot', failures);
  const resolvedProject = absolutePath(targetRoot, 'projectRoot', failures);
  if (resolvedWorkspace && resolvedProject) {
    if (!isInside(resolvedProject, resolvedWorkspace)) {
      failures.push('projectRoot must remain inside workspaceRoot');
      check('project-root-boundary', 'fail', `${resolvedProject} escapes ${resolvedWorkspace}`);
    } else {
      check('project-root-boundary', 'pass', `${resolvedProject} inside ${resolvedWorkspace}`);
    }
    if (path.resolve(materializationPlan?.project?.root || '') !== resolvedProject
      && materializationPlan?.project?.root) {
      failures.push('projectRoot must match materializationPlan.project.root');
      check('project-root-plan-parity', 'fail', 'CLI target differs from approved plan');
    } else {
      check('project-root-plan-parity', 'pass', 'target agrees with approved plan or plan has no root');
    }
    if (path.isAbsolute(resolvedProject) && !path.basename(resolvedProject)) {
      failures.push('projectRoot cannot be a filesystem root');
    }
    if (path.resolve(resolvedProject) !== resolvedProject) {
      warnings.push('projectRoot was normalized before preflight');
    }
    check(
      'project-root-state',
      fs.existsSync(resolvedProject) ? (fs.statSync(resolvedProject).isDirectory() ? 'pass' : 'fail') : 'not-created',
      fs.existsSync(resolvedProject) ? 'existing directory' : 'directory may be created only by a separate reviewed adapter',
    );
    if (fs.existsSync(resolvedProject) && !fs.statSync(resolvedProject).isDirectory()) {
      failures.push('projectRoot exists but is not a directory');
    }
  }

  return {
    schemaVersion: 1,
    kind: 'project-execution-preflight',
    valid: failures.length === 0,
    project: {
      id: materializationPlan?.project?.id || null,
      root: resolvedProject,
    },
    plans: {
      materializationPlanId: materializationPlan?.planId || null,
      acquisitionPlanId: acquisitionPlan?.planId || null,
    },
    checks,
    failures,
    warnings,
    mutation: 'none',
    nextSteps: failures.length ? ['resolve every failed check and rerun this read-only preflight'] : [
      'hand the approved plans to a separately authorized local execution adapter',
      'record an acquisition receipt before proposing any Work State update',
    ],
  };
};
