# Workout App

The goal is to create a simple MVP application for gym trainers to track their client exercises, weight and reps. At first there will be two pages. First page will show a table with workout plans. Second page will be a workout plan detail. Both pages will structure data into tables. I expect users to primary use it from a phone, so **we should design it primary for phones**.

## Design

I would like to use dark theme with black-ish background, white and red as text and button colors ( design colors should be suitable for the gym projects ).

## Pages

### Workout plan list

- table showing workout plans - **strongly optimized for mobile**
- table should contains these cols: name (string), "start" button ( navigates user to workout mode of workout plan detail ) three dots action button that allows to edit and delete workout plan
- click on name row will result in navigating user to the Workout plan detail page
- "new plan" button showing above the table
- both "new plan" and edit existing should navigate user to Workout plan detail with preset mode for editing

### Workout plan detail

- shows plan name and table with exercises, weights and reps that are part of the plan - **strongly optimized for mobile**
- this page or precisely component will work in three modes: preview, edit and workout

#### Preview mode

- heading with workout plan name
- buttons "edit" and "workout" that will navigate user to edit or workout modes
- table with following cols: exercise name (string), weight (number), reps (number)

#### Edit mode

- input with workout plan name preset
- table with following cols: exercise name (string), weight (number), reps (number), done checkbox (boolean)
- all cells should be editable
- user should be able to add new row
- under the table there should be save button and reset button

#### Workout mode

- heading with workout plan name
- table with following cols: exercise name (string), weight (number), reps (number), done checkbox (boolean)
- user should be able to change weight, reps by clicking on cell - should let user edit cell on the spot
- user should be able to check the checkbox
- under the table there should be a button saying "end workout" which will uncheck all checkboxes and navigate to Workout plan list page. There should be also validation in place if user clicks on "end workout" but not all checkboxes are checked, we should display dialog with confirmation text and button.

## Tech stack

- NextJS - follow React and NextJS best practices
- Tailwind
- Shadcn
- LocalStorage ( lets start with just local storage but lets implement the way it is simple to swap for backend api calls later etc.)

## UI validation

- use Playwright MCP to test and validate the solution