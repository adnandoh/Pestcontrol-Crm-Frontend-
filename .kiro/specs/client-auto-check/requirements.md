# Requirements Document

## Introduction

This feature enhances the job card creation process by providing real-time feedback when users enter a phone number, automatically checking if a client with that number already exists in the system and providing visual feedback to improve user experience.

## Glossary

- **Job Card Creation Page**: The web page at `/jobcards/create` where users create new job cards
- **Mobile Number Field**: The input field where users enter a 10-digit phone number
- **Client Check API**: The backend service that verifies if a client exists by mobile number
- **Visual Feedback**: UI elements that inform users about the client check status and results
- **Auto-populate**: Automatically filling form fields with existing client data

## Requirements

### Requirement 1

**User Story:** As a user creating a job card, I want the system to automatically check if a client exists when I enter a complete 10-digit mobile number, so that I can avoid creating duplicate clients and save time on data entry.

#### Acceptance Criteria

1. WHEN the user enters exactly 10 digits in the mobile number field, THE Job Card Creation Page SHALL automatically trigger the Client Check API
2. WHILE the Client Check API is processing, THE Job Card Creation Page SHALL display a loading indicator next to the mobile number field
3. IF the Client Check API returns that a client exists, THEN THE Job Card Creation Page SHALL auto-populate the client name, email, city, and address fields with the existing client data
4. IF the Client Check API returns that no client exists, THEN THE Job Card Creation Page SHALL display a message indicating this is a new client
5. IF the Client Check API fails or times out, THEN THE Job Card Creation Page SHALL display an error message and allow the user to continue with manual entry

### Requirement 2

**User Story:** As a user creating a job card, I want clear visual feedback about the client check status, so that I understand what the system is doing and can make informed decisions about the data entry.

#### Acceptance Criteria

1. WHEN the client check is in progress, THE Job Card Creation Page SHALL display a loading spinner or progress indicator
2. WHEN an existing client is found, THE Job Card Creation Page SHALL display a success message with the client's name
3. WHEN no existing client is found, THE Job Card Creation Page SHALL display an informational message indicating this is a new client
4. WHEN the client check encounters an error, THE Job Card Creation Page SHALL display an error message that does not prevent form submission
5. THE Job Card Creation Page SHALL position all status messages below the mobile number field for clear visibility

### Requirement 3

**User Story:** As a user creating a job card, I want the ability to modify auto-populated client information, so that I can correct any outdated or incorrect data before submitting the form.

#### Acceptance Criteria

1. WHEN client data is auto-populated from an existing client, THE Job Card Creation Page SHALL allow users to edit all auto-populated fields
2. WHEN a user modifies auto-populated data, THE Job Card Creation Page SHALL retain the user's changes
3. THE Job Card Creation Page SHALL not re-trigger the client check when users modify other fields after the initial check
4. WHEN a user changes the mobile number after a successful client check, THE Job Card Creation Page SHALL clear the auto-populated data and perform a new client check
5. THE Job Card Creation Page SHALL preserve any user-entered data that was not auto-populated