# Dabirestan Amini 3

Build a complete, professional School Management System with a modern, beautiful, and responsive dashboard.

IMPORTANT: The entire website interface must be in Persian (Farsi), with full RTL (Right-to-Left) layout. Use Persian fonts such as Vazirmatn.

1. School Structure

The school has exactly 9 classes.

There are approximately 250 students in total.

Create 9 separate classes with realistic random Persian student names.

Distribute the 250 students across the 9 classes.

Each student must have a unique ID.

Use fictional student names for now.

Allow administrators to edit student names and add or remove students later.

2. Main Dashboard

Create a beautiful dashboard showing:

Total students.

Total classes.

Number of students present today.

Number of absent students today.

Overall attendance percentage.

Recent attendance records.

Quick access to all 9 classes.

3. Attendance System

Inside each class, display a complete list of students.

For each student, include:

Student name.

Student ID.

Present button.

Absent button.

Late button.

Attendance status indicator.

Teachers should be able to mark attendance with one click.

Include date selection so teachers can view and edit attendance records for previous days.

Save attendance records separately for each student and each date.

4. Student Grades

For every student, create a grade management system.

Teachers can enter grades from 0 to 20.

Support multiple grades throughout the school year.

Include the date and subject for each grade.

Automatically calculate each student's average grade.

Show the average for each subject and the overall average.

Display grade history and progress charts.

Allow teachers to edit or delete grades.

5. Student Notes

Add a notes section next to every student's name.

Teachers should be able to:

Write personal educational notes about students.

Record behavioral observations.

Record strengths and areas that need improvement.

Add dated notes throughout the year.

Edit and delete notes.

View the complete history of notes for each student.

6. Student Profile

Clicking on a student's name should open a detailed profile containing:

Full name and student ID.

Class name.

Attendance history.

Number of absences and late arrivals.

All grades.

Overall average.

Progress chart.

Teacher notes and observations.

7. Design

Create a premium, modern school dashboard.

Design requirements:

Professional and minimal UI.

Persian RTL layout.

Beautiful sidebar navigation.

Modern cards and tables.

Smooth animations.

Search bar for finding students.

Filters for classes and attendance status.

Responsive design for computers, tablets, and mobile phones.

Use a clean color palette with navy blue, white, and soft blue accents.

8. Data and Functionality

IMPORTANT:

All buttons must actually work.

All data must be saved persistently.

Refreshing the page must NOT delete any records.

Use a proper database such as Supabase.

Organize data for students, classes, attendance, grades, subjects, and notes.

Include sample data for all 9 classes and 250 fictional students.

Add data validation and confirmation dialogs before deleting records.

9. User Roles

Create two roles:

Administrator: Full access to all classes, students, grades, attendance, and settings.

Teacher: Access to assigned classes and permission to manage attendance, grades, and student notes.

10. Final Requirements

Do not create a static mockup or a website with non-functional buttons.

Build a fully functional school management application with real database integration.

Start by building the complete dashboard, then implement all sections and connect everything together.

The application should be ready for future expansion and real school usage.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dabirestan-amini-3.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca9dc1d3-b1c0-519c-9849-0ad925366b12).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
