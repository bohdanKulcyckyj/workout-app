I would like to make exercise a standalone entity, that can be part of multiple workout plans.

Exercise entity should have:

- id (string)*
- label (string)*
- description (string) optional
- weight (number) optional
- reps (number) optional

As exercise becomes an entity we need to manage it. We need following pages:

- List exercises page ( similar to list workout plans )
- Detail exercise ( preview and edit mode )

In `/components/plan-form.tsx` instead of having a button "+ Add Exercise" we are going to need different approach of adding new exercise. We could do it from dropdown select of existing exercises.