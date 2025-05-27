# FYP_A_Web

## Project Topic
Web-Based Application for Cardiac Component Segmentation

## Project Overview
This project aims to develop a web-based application that integrates existing deep learning models for cardiac segmentation. The application will allow users to upload MRI images, perform segmentation to identify key cardiac components (left ventricle cavity, myocardium, right ventricle), and view the results in a user-friendly interface.

The goal is to create a platform that will be useful for medical professionals (e.g., cardiologists, radiologists) and researchers to automatically segment MRI scans for improved diagnosis and analysis.

## Objectives
1. User Input for MRI Upload:
- Allow users to upload MRI files in NifTI or DICOM format.
- Provide the option to upload single files or a folder of files.

2. Cardiac Segmentation:
- Integrate with existing state-of-the-art (SOTA) cardiac segmentation models.
- Perform segmentation on the MRI images and display segmentation results for different components (left ventricle cavity, myocardium, right ventricle).

3. Visualization and Interaction:
- Allow users to interact with MRI images and segmentation results.
- Provide options to amend the Region of Interest (ROI) for segmentation if required.

4. Data Export:
- Allow users to save, export, and delete segmentation outputs in NifTI format.

5. User Authentication:
- Users can create an account to store uploaded MRI stacks and segmentation results.
- Ensure data privacy by deleting user-related data upon account deletion.

## Technologies Used
1. React.js for building interactive user interfaces.
2. Tailwind CSS for styling (or your preferred CSS framework).
3. React Router for managing routing between different pages (Home, Viewer, Dashboard).
4. Axios for making API requests to the backend.

## Requirements
- Node.js and npm 

## Installation 
1. Clone the repository 
2. Install dependencies
```npm install``` 
3. Run the project
```npm run dev```

