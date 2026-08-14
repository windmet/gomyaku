# Consumer cutover gate

The fresh-history repositories are bootstrapped and independently validated.
Qianqingtie still consumes its local seam modules at this stage. The next
change is not a blind dependency edit; it must establish a reachable, exact
GOMYAKU pin and then switch one primitive at a time.

Required order:

1. Make the pinned GOMYAKU artifact reachable to the Qianqingtie CI context.
2. Install the exact tagged GOMYAKU artifact in a disposable clone and record
   the resolved tag/commit.
3. Switch schema, validator, capability, and People projection consumers one at
   a time, preserving the Qianqingtie adapters.
4. Run all publication and browser gates after each switch.
5. Delete a local duplicate only after its replacement is imported and green.

No Reader extraction or publication-content migration belongs in this gate.
