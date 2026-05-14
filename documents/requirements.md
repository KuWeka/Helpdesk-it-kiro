# Requirements Document

## Introduction

PoldaHelp Kalsel is an internal IT Helpdesk Ticketing system for Polda Kalimantan Selatan (South Kalimantan Police). The system enables Satker (work units) to submit IT support tickets, which are managed by Bidtekkom (system admin), assigned to Padal (field coordinators), and visible to Teknisi (field technicians) in a read-only capacity. The application is a full-stack monorepo web application built with Next.js (App Router) on the frontend and Express.js with Prisma ORM and MySQL on the backend, featuring real-time notifications via Socket.io.

## Glossary

- **System**: The PoldaHelp Kalsel IT Helpdesk Ticketing application as a whole
- **Auth_Service**: The authentication and authorization module handling login, registration, JWT tokens, and password management
- **Ticket_Service**: The module responsible for ticket creation, status transitions, assignment, and lifecycle management
- **Rating_Service**: The module handling ticket ratings and feedback submission
- **Notification_Service**: The real-time notification module using Socket.io for event-driven alerts
- **Staff_Service**: The module for managing users, roles, and Padal team composition
- **Report_Service**: The module for generating monthly reports with PDF and Excel export
- **Audit_Service**: The module for logging and displaying audit trail records
- **Profile_Service**: The module for user profile, security settings, and preferences management
- **Satker**: A user role representing a work unit that creates and tracks tickets (default role for all new accounts)
- **Bidtekkom**: A user role representing the system administrator with full control over all system functions
- **Padal**: A user role representing a field coordinator who is assigned tickets and manages a team of Teknisi
- **Teknisi**: A user role representing a field technician with read-only access to tickets within their assigned Padal
- **Ticket_Number**: A unique identifier for each ticket following the format TKT-{YEAR}-{5-digit padded sequence}
- **Status_PENDING**: The initial status of a newly created ticket awaiting assignment
- **Status_PROSES**: The status indicating a ticket has been assigned and is being worked on
- **Status_SELESAI**: The status indicating a ticket has been completed
- **Status_DIBATALKAN**: The status indicating a ticket has been cancelled
- **Soft_Delete**: A deletion method that marks a record as inactive/deleted without physically removing it from the database
- **Divisi**: The organizational division/unit a Satker belongs to, set after registration in profile settings

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account, so that I can access the helpdesk system.

#### Acceptance Criteria

1. WHEN a user submits a valid registration form with nama (full name, 2-100 characters), email (valid email format), nomor WhatsApp (9-15 digits, may start with country code), and password, THE Auth_Service SHALL create a new account with the SATKER role assigned automatically
2. IF a registration request includes a password that does not meet the minimum requirements of at least 8 characters and at most 128 characters containing at least one uppercase letter and at least one number, THEN THE Auth_Service SHALL reject the request with an error indicating which password requirement was not met
3. THE Auth_Service SHALL enforce a rate limit of 5 registration requests per hour per IP address
4. IF the rate limit is exceeded, THEN THE Auth_Service SHALL reject the request with an error indicating the limit has been reached and the time until the limit resets
5. IF a registration request uses an email that already exists, THEN THE Auth_Service SHALL return a descriptive error indicating the email is already registered
6. THE Auth_Service SHALL store passwords using bcryptjs hashing before persisting to the database
7. THE Auth_Service SHALL not require or accept a divisi field during registration
8. WHEN a registration is successful, THE Audit_Service SHALL record the registration event with the new user ID and timestamp
9. IF a registration request contains a nama shorter than 2 characters or longer than 100 characters, or a nomor WhatsApp that is not between 9 and 15 digits, THEN THE Auth_Service SHALL reject the request with an error indicating which field failed validation

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my role-specific dashboard.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_Service SHALL return a JWT token containing the user ID, nama, email, and role, with a token expiration time of 24 hours from issuance
2. IF a user submits invalid credentials, THEN THE Auth_Service SHALL return an authentication error without revealing which field (email or password) is incorrect
3. THE Auth_Service SHALL enforce a rate limit of 10 login requests per 15 minutes per IP address
4. IF a user exceeds the login rate limit, THEN THE Auth_Service SHALL reject the request with an error indicating the rate limit has been exceeded and the remaining cooldown time
5. IF a user attempts to log in with credentials belonging to a soft-deleted (inactive) account, THEN THE Auth_Service SHALL return an error indicating the account is inactive
6. WHEN a user logs in successfully, THE Audit_Service SHALL record the login event with timestamp and user ID

### Requirement 3: Password Recovery

**User Story:** As a user who forgot my password, I want to reset it, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a user requests a password reset with a registered email, THE Auth_Service SHALL generate a reset token with a validity period of 15 minutes and send it to the email address
2. WHEN a user submits a valid reset token with a new password that meets the minimum requirements (8 characters, one uppercase, one number), THE Auth_Service SHALL update the password and invalidate the reset token
3. IF a user submits an expired or invalid reset token, THEN THE Auth_Service SHALL return an error indicating the token is no longer valid
4. IF a user submits a valid reset token with a new password that does not meet the minimum requirements (8 characters, one uppercase, one number), THEN THE Auth_Service SHALL return an error indicating which password requirements are not met
5. IF a user requests a password reset with an email that is not registered, THEN THE Auth_Service SHALL respond with the same success indication as a valid request to prevent revealing whether an email is registered
6. THE Auth_Service SHALL enforce a rate limit of 5 password reset requests per hour per IP address
7. WHEN a password is successfully reset, THE Audit_Service SHALL record the password reset event with the user ID and timestamp

### Requirement 4: Ticket Creation

**User Story:** As a Satker, I want to create a support ticket, so that I can request IT assistance.

#### Acceptance Criteria

1. WHEN a Satker submits a ticket form with judul (1-150 characters), deskripsi (1-2000 characters), kategori (one of the system-defined category values), lokasi (1-200 characters), and optional attachments, THE Ticket_Service SHALL create a new ticket with status PENDING and a generated Ticket_Number in the format TKT-{YEAR}-{5-digit padded sequence}
2. IF a Satker submits a ticket form with any required field (judul, deskripsi, kategori, or lokasi) missing or empty, THEN THE Ticket_Service SHALL reject the request with an error message indicating which fields failed validation
3. IF a Satker has one or more tickets with status SELESAI that have not been rated, THEN THE Ticket_Service SHALL reject the ticket creation request with a message indicating unrated completed tickets exist
4. WHEN a new ticket is created, THE Notification_Service SHALL send a real-time notification to all users with the Bidtekkom role containing the ticket number and judul
5. WHEN a new ticket is created, THE Audit_Service SHALL record the creation event with the ticket number, creator ID, and timestamp
6. THE Ticket_Service SHALL accept file attachments with a maximum size of 5MB per file in the formats: jpg, jpeg, png, pdf, doc, docx, xls, xlsx
7. IF a file attachment exceeds 5MB or uses a disallowed format, THEN THE Ticket_Service SHALL reject the attachment with an error message indicating whether the failure was due to file size or disallowed format
8. THE Ticket_Service SHALL associate the ticket with the Satker's current divisi value at the time of creation
9. IF a Satker attempts to create a ticket without having set their divisi in profile settings, THEN THE Ticket_Service SHALL reject the creation and prompt the Satker to complete their profile first

### Requirement 5: Ticket Number Generation

**User Story:** As a system operator, I want tickets to have unique sequential numbers, so that tickets can be easily referenced and tracked.

#### Acceptance Criteria

1. THE Ticket_Service SHALL generate ticket numbers in the format TKT-{YEAR}-{SEQUENCE} where YEAR is the 4-digit current year based on server local time and SEQUENCE is a zero-padded 5-digit number starting from 00001
2. WHEN a new ticket is created, THE Ticket_Service SHALL assign the next sequential number by incrementing the current year's sequence by 1, guaranteeing uniqueness even under concurrent ticket creation
3. WHEN the first ticket of a new calendar year is created, THE Ticket_Service SHALL start the sequence at 00001 for that year regardless of the previous year's final sequence value
4. IF the sequence counter for the current year has reached 99999, THEN THE Ticket_Service SHALL reject ticket creation with an error indicating the annual ticket capacity has been exceeded
5. THE Ticket_Service SHALL never reuse or reassign a ticket number, including numbers assigned to cancelled or soft-deleted tickets

### Requirement 6: Ticket Assignment

**User Story:** As a Bidtekkom, I want to assign tickets to a Padal, so that tickets are routed to the appropriate field coordinator.

#### Acceptance Criteria

1. WHEN a Bidtekkom assigns a ticket to a Padal, THE Ticket_Service SHALL set the padalId field, change the status from PENDING to PROSES, and record the tanggalAssign timestamp
2. WHEN a ticket is assigned, THE Notification_Service SHALL send a real-time notification to the assigned Padal containing the ticket number and ticket judul
3. WHEN a ticket is assigned, THE Audit_Service SHALL record the assignment event with the ticket number, assigner ID, assignee ID, and timestamp
4. IF a Bidtekkom attempts to assign a ticket that is not in PENDING status, THEN THE Ticket_Service SHALL reject the assignment with an error indicating the current status does not allow assignment
5. IF a Bidtekkom attempts to assign a ticket to a user ID that does not exist or does not have the Padal role, THEN THE Ticket_Service SHALL reject the assignment with an error indicating the assignee is not a valid Padal
6. IF a Bidtekkom attempts to assign a ticket to a Padal whose account has been soft-deleted (inactive), THEN THE Ticket_Service SHALL reject the assignment with an error indicating the selected Padal is inactive

### Requirement 7: Ticket Status Transitions

**User Story:** As a system operator, I want ticket statuses to follow a defined one-way flow, so that ticket lifecycle is predictable and auditable.

#### Acceptance Criteria

1. THE Ticket_Service SHALL enforce the following valid status transitions: PENDING to PROSES (via assignment by Bidtekkom), PROSES to SELESAI (via completion by Padal), PENDING to DIBATALKAN (via cancellation), PROSES to DIBATALKAN (via cancellation)
2. IF a status transition is attempted that does not match the valid transitions, THEN THE Ticket_Service SHALL reject the transition with an error indicating the current status and the attempted target status, and SHALL leave the ticket in its current status with no fields modified
3. THE Ticket_Service SHALL treat SELESAI and DIBATALKAN as terminal statuses that do not allow any further transitions, including reverse transitions (SELESAI back to PROSES, PROSES back to PENDING, or DIBATALKAN to any other status)
4. WHEN a ticket transitions to SELESAI, THE Ticket_Service SHALL set the tanggalSelesai field to the current server timestamp at the moment the transition is processed
5. WHEN a ticket transitions to SELESAI, THE Notification_Service SHALL send a real-time notification to the Satker who created the ticket
6. WHEN a ticket transitions to DIBATALKAN, THE Notification_Service SHALL send a real-time notification to the Satker who created the ticket and the assigned Padal (if one exists)
7. WHEN any status transition occurs, THE Audit_Service SHALL record the event with the ticket number, actor ID, previous status, new status, and timestamp
8. IF two or more transition requests are received for the same ticket concurrently, THEN THE Ticket_Service SHALL process only the first valid request and reject subsequent requests that conflict with the resulting status

### Requirement 8: Ticket Completion

**User Story:** As a Padal, I want to mark a ticket as completed, so that the Satker knows their issue has been resolved.

#### Acceptance Criteria

1. WHEN the assigned Padal marks a ticket as SELESAI, THE Ticket_Service SHALL change the status from PROSES to SELESAI and set the tanggalSelesai timestamp to the current server time
2. WHEN a ticket is completed, THE Audit_Service SHALL record the completion event with the ticket number, completer ID, and timestamp
3. IF a user attempts to complete a ticket that is not in PROSES status, THEN THE Ticket_Service SHALL reject the request with an error indicating the ticket must be in PROSES status
4. IF a Padal attempts to complete a ticket that is not assigned to them, THEN THE Ticket_Service SHALL reject the request with an authorization error

### Requirement 9: Ticket Rating

**User Story:** As a Satker, I want to rate a completed ticket, so that I can provide feedback on the service quality.

#### Acceptance Criteria

1. WHEN a Satker submits a rating for their own ticket with status SELESAI, THE Rating_Service SHALL store the rating with a bintang value (integer 1-5) and feedback text (1 to 1000 characters, whitespace-only not accepted)
2. IF a Satker attempts to rate a ticket that does not have status SELESAI, THEN THE Rating_Service SHALL reject the rating with an error indicating the ticket must be completed first
3. IF a Satker attempts to rate a ticket they did not create, THEN THE Rating_Service SHALL reject the rating with an authorization error
4. IF a ticket already has a rating, THEN THE Rating_Service SHALL reject any additional rating submission for that ticket with an error indicating the ticket has already been rated
5. IF a Satker submits a rating with a bintang value outside the integer range 1-5 or a feedback field that is empty or exceeds 1000 characters, THEN THE Rating_Service SHALL reject the submission with an error indicating which field failed validation
6. WHEN a rating is submitted, THE Audit_Service SHALL record the rating event with the ticket number, rater ID, bintang value, and timestamp

### Requirement 10: Real-Time Notifications

**User Story:** As a user, I want to receive real-time notifications, so that I am immediately aware of ticket updates relevant to me.

#### Acceptance Criteria

1. WHEN a user connects to the Socket.io server, THE Notification_Service SHALL authenticate the connection using the JWT token and join the user to room user_{userId}
2. IF a Socket.io connection attempt uses an invalid or expired JWT token, THEN THE Notification_Service SHALL reject the connection and emit an authentication error event to the client before disconnecting
3. WHEN a notification-triggering event occurs (ticket creation, ticket assignment, ticket completion, or ticket cancellation), THE Notification_Service SHALL deliver a notification containing the event type, ticket number, a descriptive message, and a timestamp to the target user's room within 5 seconds of the event
4. WHEN a user requests to mark a notification as read, THE Notification_Service SHALL update the read status of that specific notification only if the notification belongs to the requesting user
5. WHEN a user requests to mark all notifications as read, THE Notification_Service SHALL update the read status of all unread notifications belonging to that user
6. WHEN a user requests to delete a notification, THE Notification_Service SHALL remove the notification from the user's notification list only if the notification belongs to the requesting user
7. THE Notification_Service SHALL persist all notifications to the database so they are available on page reload
8. IF a user attempts to mark as read or delete a notification that does not belong to them, THEN THE Notification_Service SHALL reject the request with a 403 Forbidden response
9. WHEN a user loads the notifications view, THE Notification_Service SHALL return the user's notifications ordered by timestamp descending with a maximum of 50 notifications per page and an unread count

### Requirement 11: Staff Management

**User Story:** As a Bidtekkom, I want to manage users and team composition, so that the system reflects the current organizational structure.

#### Acceptance Criteria

1. WHILE a user has the Bidtekkom role, THE Staff_Service SHALL allow viewing all registered users with their roles, nama, email, nomor WhatsApp, divisi, and account status (active/inactive) in a paginated list displaying up to 20 users per page
2. WHEN a Bidtekkom changes a user's role, THE Staff_Service SHALL update the role to one of the valid roles (Satker, Padal, Teknisi, Bidtekkom) and THE Audit_Service SHALL record the role change event with the previous role, new role, actor ID, target user ID, and timestamp
3. WHEN a Bidtekkom resets a user's password, THE Staff_Service SHALL generate a new temporary password of at least 12 characters containing uppercase, lowercase, and numeric characters, hash it with bcryptjs, display the temporary password to the Bidtekkom once for communication to the user, and THE Audit_Service SHALL record the password reset event
4. WHEN a Bidtekkom deletes a user account, THE Staff_Service SHALL perform a soft delete (mark as inactive) rather than permanently removing the record, and THE Audit_Service SHALL record the deletion event with the actor ID, target user ID, and timestamp
5. WHEN a Bidtekkom adds a Teknisi to a Padal team, THE Staff_Service SHALL create the team association between the Teknisi and the Padal, and THE Audit_Service SHALL record the team assignment event with the Teknisi ID, Padal ID, and timestamp
6. IF a Bidtekkom attempts to add a Teknisi who is already assigned to a Padal team, THEN THE Staff_Service SHALL reject the request with an error indicating the Teknisi must first be removed from their current team before being assigned to a new one
7. WHEN a Bidtekkom removes a Teknisi from a Padal team, THE Staff_Service SHALL remove the team association between the Teknisi and the Padal, and THE Audit_Service SHALL record the team removal event with the Teknisi ID, Padal ID, and timestamp
8. WHILE a user has the Bidtekkom role, THE Staff_Service SHALL display a list of all Padal users with their associated Teknisi team members
9. IF a Bidtekkom attempts to soft-delete a user who has active tickets (status PENDING or PROSES), THEN THE Staff_Service SHALL display a warning indicating the number of active tickets before requiring confirmation to proceed

### Requirement 12: Monthly Reports

**User Story:** As a Bidtekkom or Padal, I want to generate monthly reports, so that I can review ticket performance and statistics.

#### Acceptance Criteria

1. WHEN a Bidtekkom requests a monthly report, THE Report_Service SHALL return all tickets whose tanggalBuat falls within the specified month and year
2. WHEN a Padal requests a monthly report, THE Report_Service SHALL return only tickets assigned to that Padal whose tanggalBuat falls within the specified month and year
3. THE Report_Service SHALL include the following columns in the report: nomorTiket, judul, namaSatker, divisiSatker, lokasi, tanggalBuat, tanggalAssign, tanggalSelesai, status, rating, feedback
4. WHEN a Bidtekkom or Padal requests a PDF export, THE Report_Service SHALL generate a downloadable PDF file containing the filtered report data presented in a tabular layout with column headers matching criterion 3 and the summary section from criterion 6
5. WHEN a Bidtekkom or Padal requests an Excel export, THE Report_Service SHALL generate a downloadable Excel (.xlsx) file containing the filtered report data with column headers matching criterion 3 and the summary section in a separate area
6. THE Report_Service SHALL display a summary section showing total tickets, count of tickets per status (PENDING, PROSES, SELESAI, DIBATALKAN), and average rating (rounded to 1 decimal place, calculated only from tickets that have a rating) for the filtered period
7. IF no tickets match the specified month and year filter, THEN THE Report_Service SHALL return an empty report with all columns present and the summary section showing zero for all counts and no value for average rating
8. IF a user without the Bidtekkom or Padal role attempts to access the report, THEN THE Report_Service SHALL deny access with a 403 Forbidden response

### Requirement 13: Satker Dashboard

**User Story:** As a Satker, I want to see my ticket overview on a dashboard, so that I can quickly understand the status of my requests.

#### Acceptance Criteria

1. WHEN a Satker accesses the dashboard, THE System SHALL display summary cards showing counts of the Satker's tickets grouped by status: PENDING, PROSES, SELESAI, and DIBATALKAN
2. WHEN a Satker accesses the dashboard, THE System SHALL display a table of the Satker's 10 most recent tickets sorted by tanggalBuat descending, with columns: nomorTiket, judul, status, tanggalBuat
3. IF a Satker has completed tickets (SELESAI) without ratings, THEN THE System SHALL display an alert banner above the recent tickets table indicating the number of unrated tickets that require attention before new tickets can be created
4. WHEN a Satker clicks on a ticket in the recent tickets table, THE System SHALL navigate to the ticket detail view
5. IF a Satker has no tickets, THEN THE System SHALL display an empty state message indicating no tickets have been created and providing a call-to-action to create a new ticket

### Requirement 14: Bidtekkom Dashboard

**User Story:** As a Bidtekkom, I want a comprehensive dashboard, so that I can monitor overall system activity and performance.

#### Acceptance Criteria

1. WHEN a Bidtekkom accesses the dashboard, THE System SHALL display summary cards showing: total ticket count, PENDING count, PROSES count, SELESAI count, and total registered user count
2. WHEN a Bidtekkom accesses the dashboard, THE System SHALL display a bar chart showing ticket distribution by status (PENDING, PROSES, SELESAI, DIBATALKAN) using Recharts
3. WHEN a Bidtekkom accesses the dashboard, THE System SHALL display a line chart showing ticket creation trend per month for the current year using Recharts, displaying all 12 months with a zero value for months that have no tickets
4. WHEN a Bidtekkom accesses the dashboard, THE System SHALL display a table of the 10 most recent tickets across all Satker, ordered by tanggalBuat descending, with columns: nomorTiket, judul, namaSatker, status, tanggalBuat
5. WHEN a Bidtekkom accesses the dashboard, THE System SHALL display a section showing up to 10 unassigned tickets (PENDING status), ordered by tanggalBuat ascending (oldest first)
6. WHEN a Bidtekkom clicks the quick-assign button on an unassigned ticket, THE System SHALL display a modal containing a list of available Padal users, and upon selection THE Ticket_Service SHALL assign the ticket to the selected Padal following the standard assignment flow (status change to PROSES, notification to Padal, audit log entry)

### Requirement 15: Padal Dashboard

**User Story:** As a Padal, I want to see my assigned workload and team, so that I can manage my tasks effectively.

#### Acceptance Criteria

1. WHEN a Padal accesses the dashboard, THE System SHALL display summary cards showing: active tickets count (PROSES), completed tickets count (SELESAI), and average bintang rating (rounded to 1 decimal place) for the Padal's assigned tickets; IF no rated tickets exist, THEN THE System SHALL display "0" or a dash indicator in place of the average rating
2. WHEN a Padal accesses the dashboard, THE System SHALL display a table of tickets currently assigned to the Padal in PROSES status with columns: nomorTiket, judul, namaSatker, lokasi, tanggalAssign, and a "Selesai" action button, sorted by tanggalAssign in ascending order (oldest first)
3. WHEN a Padal accesses the dashboard, THE System SHALL display a team section listing all Teknisi members assigned to the Padal with their nama and nomor WhatsApp; IF no Teknisi are assigned to the Padal, THEN THE System SHALL display a message indicating no team members have been assigned
4. WHEN a Padal clicks on a ticket in the table, THE System SHALL navigate to the ticket detail view where the Padal can mark it as SELESAI or view full ticket information
5. WHEN a Padal clicks the "Selesai" button on a ticket row, THE System SHALL display a confirmation modal; WHEN the Padal confirms the action, THE System SHALL mark the ticket as SELESAI, update the ticket status in the table, and send a notification to the Satker; IF the Padal dismisses the modal, THEN THE System SHALL close the modal and take no further action
6. IF a Padal accesses the dashboard and has no tickets in PROSES status, THEN THE System SHALL display the active tickets table in an empty state with a message indicating no active tickets are currently assigned

### Requirement 16: Teknisi Dashboard

**User Story:** As a Teknisi, I want to see tickets from my Padal, so that I can stay informed about ongoing work without modifying anything.

#### Acceptance Criteria

1. WHEN a Teknisi accesses the dashboard, THE System SHALL display summary cards showing: active tickets count (PROSES) and total completed tickets count (SELESAI) for the Teknisi's associated Padal
2. WHEN a Teknisi accesses the dashboard, THE System SHALL display a read-only table of active tickets (PROSES) assigned to the Teknisi's Padal with columns: nomorTiket, judul, namaSatker, lokasi, tanggalAssign, sorted by tanggalAssign descending (most recent first)
3. WHEN a Teknisi clicks on a ticket in the table, THE System SHALL navigate to a read-only ticket detail view without any action buttons (no edit, no complete, no cancel)
4. IF a Teknisi is not yet assigned to any Padal, THEN THE System SHALL hide the summary cards and ticket table and display only a message indicating the Teknisi has not been assigned to a team and should contact Bidtekkom
5. IF a Teknisi is assigned to a Padal but no tickets in PROSES status exist, THEN THE System SHALL display the summary cards with a zero count for active tickets and show an empty-state message in the table area indicating no active tickets are available

### Requirement 17: Access Control

**User Story:** As a system administrator, I want role-based access control enforced, so that users can only perform actions appropriate to their role.

#### Acceptance Criteria

1. THE System SHALL validate the user's JWT token, role, and data ownership on every API request before processing the request
2. IF a request contains an invalid, expired, or missing JWT token, THEN THE System SHALL return a 401 Unauthorized response without processing the request
3. WHILE a user has the Teknisi role, THE System SHALL restrict the user to read-only access on ticket endpoints (GET only) and deny access to ticket creation, assignment, completion, cancellation, and rating endpoints
4. WHILE a user has the Padal role, THE System SHALL restrict ticket visibility to only tickets assigned to that Padal, and restrict accessible functions to ticket completion, monthly reports for own tickets, team viewing, and profile management
5. WHILE a user has the Teknisi role, THE System SHALL restrict ticket visibility to only tickets assigned to the Teknisi's associated Padal
6. IF a Teknisi is not associated with any Padal, THEN THE System SHALL return an empty ticket list for ticket-related queries and deny access to ticket detail endpoints
7. WHILE a user has the Satker role, THE System SHALL restrict access to only the Satker's own tickets, profile, rating functions, and ticket creation
8. WHILE a user has the Bidtekkom role, THE System SHALL grant full access to all system functions including staff management, system settings, audit log, and all tickets
9. IF a user attempts to access a resource or action not permitted by their role, THEN THE System SHALL return a 403 Forbidden response and not process the request
10. IF a user attempts to access or modify data belonging to another user of the same role (e.g., Satker accessing another Satker's ticket), THEN THE System SHALL return a 403 Forbidden response and not modify any data

### Requirement 18: User Profile Management

**User Story:** As a user, I want to manage my profile information, so that my account details are up to date.

#### Acceptance Criteria

1. WHEN a user updates their profile, THE Profile_Service SHALL save the updated fields: foto (profile photo), nama (between 2 and 100 characters), and nomor WhatsApp (numeric string between 10 and 15 digits)
2. WHERE a user has the Satker role, THE Profile_Service SHALL additionally allow editing the divisi field
3. WHEN a user submits a new password via the security settings, THE Profile_Service SHALL validate the current password, then validate the new password meets the minimum requirements (8 characters, one uppercase, one number) before updating, and THE Audit_Service SHALL record the password change event with the user ID and timestamp
4. IF the current password provided during a password change does not match the stored password, THEN THE Profile_Service SHALL reject the request with an error message indicating the current password is incorrect without updating any credentials
5. THE Profile_Service SHALL accept profile photos with a maximum size of 5MB in the formats: jpg, jpeg, png
6. IF a profile photo upload exceeds 5MB or uses a disallowed format, THEN THE Profile_Service SHALL reject the upload with an error message indicating whether the size limit or format restriction was violated
7. IF a user submits a nomor WhatsApp value that is not a numeric string between 10 and 15 digits, THEN THE Profile_Service SHALL reject the update with an error message indicating the valid format

### Requirement 19: User Preferences

**User Story:** As a user, I want to customize my experience, so that the application suits my preferences.

#### Acceptance Criteria

1. WHEN a user selects a theme preference (light or dark), THE System SHALL immediately apply the selected theme using next-themes and persist the preference so it is retained across browser sessions
2. WHEN a user selects a language preference (Indonesian or English), THE System SHALL immediately display the interface in the selected language and persist the preference so it is retained across browser sessions
3. THE System SHALL default to light theme and Indonesian language for new users who have not yet set a preference
4. IF a persisted preference value is invalid or unrecognized, THEN THE System SHALL fall back to the default values (light theme and Indonesian language)

### Requirement 20: System Settings

**User Story:** As a Bidtekkom, I want to configure system-wide settings, so that the application reflects the organization's branding.

#### Acceptance Criteria

1. WHILE a user has the Bidtekkom role, THE System SHALL display a system settings page allowing editing of the application name (1 to 100 characters, non-blank) and logo
2. WHEN a Bidtekkom updates the application name, THE System SHALL apply the new name in the sidebar header and browser title for all user sessions on their next page load or navigation
3. WHEN a Bidtekkom updates the application logo, THE System SHALL accept an image file (max 5MB, formats: jpg, jpeg, png, svg) and display it in the sidebar and login page
4. IF a logo upload exceeds 5MB or uses a format other than jpg, jpeg, png, or svg, THEN THE System SHALL reject the upload with a descriptive error indicating which validation failed
5. IF a Bidtekkom submits an application name that is empty, whitespace-only, or exceeds 100 characters, THEN THE System SHALL reject the update with a descriptive error indicating the name must be between 1 and 100 characters
6. IF a user without the Bidtekkom role attempts to access system settings, THEN THE System SHALL deny access with a 403 Forbidden response
7. WHEN a Bidtekkom successfully updates the application name or logo, THE Audit_Service SHALL record the settings change event with the actor ID, changed field, and timestamp

### Requirement 21: Audit Logging

**User Story:** As a Bidtekkom, I want to view an audit trail, so that I can monitor all important actions performed in the system.

#### Acceptance Criteria

1. THE Audit_Service SHALL record the following events: login, registration, ticket creation, ticket assignment, ticket completion, ticket cancellation, ticket rating, user soft delete, and role change
2. THE Audit_Service SHALL store for each event: event type, actor user ID, actor nama, target entity ID, timestamp, and event-specific metadata as follows: for status transitions (assignment, completion, cancellation) the previous and new status; for role changes the previous and new role; for ticket creation the generated ticket number; for rating events the bintang value
3. WHILE a user has the Bidtekkom role, THE System SHALL display the audit log page with a paginated table (20 rows per page) using TanStack Table, searchable by actor nama and target entity ID, filterable by event type and date range, and sorted by timestamp descending (most recent first) by default
4. IF a user without the Bidtekkom role attempts to access the audit log, THEN THE System SHALL deny access with a 403 Forbidden response
5. THE Audit_Service SHALL retain audit log records indefinitely and not allow deletion of audit entries

### Requirement 22: File Upload Handling

**User Story:** As a Satker, I want to attach files to my ticket, so that I can provide supporting documentation for my issue.

#### Acceptance Criteria

1. THE Ticket_Service SHALL accept file uploads processed through Multer middleware with disk storage
2. THE Ticket_Service SHALL validate that each uploaded file does not exceed 5MB in size
3. THE Ticket_Service SHALL validate that each uploaded file has an allowed extension: jpg, jpeg, png, pdf, doc, docx, xls, xlsx
4. IF a file upload fails validation (size or format), THEN THE Ticket_Service SHALL reject only the invalid file, return an error message indicating which file failed and whether the failure was due to size or format, and continue processing the remaining valid files in the same request
5. THE Ticket_Service SHALL store uploaded files with a unique generated filename to prevent conflicts and associate each stored file with the corresponding ticket record
6. THE Ticket_Service SHALL allow a maximum of 10 file attachments per ticket, where each file must be under 5MB in size
7. IF a file upload request would cause the total number of attachments on a ticket to exceed 10, THEN THE Ticket_Service SHALL reject the entire upload request with an error message indicating the maximum attachment count has been reached

### Requirement 23: UI/UX Standards

**User Story:** As a user, I want a consistent and professional interface, so that I can use the system efficiently.

#### Acceptance Criteria

1. THE System SHALL use shadcn/ui components for all non-chart UI elements including buttons, forms, tables, modals, cards, and navigation
2. THE System SHALL use Recharts for all chart and data visualization components
3. WHEN a form field fails validation, THE System SHALL display an inline error message directly below the relevant form field within 200ms of the validation trigger, rather than using alert boxes or toast notifications
4. WHEN a user initiates a destructive action (delete account, cancel ticket, remove team member), THE System SHALL display a confirmation modal that states the action type, identifies the affected entity by name or identifier, and provides both a confirm and cancel button before executing
5. WHILE data is loading, THE System SHALL display skeleton placeholders that match the dimensions and structure of the expected content rather than spinner animations
6. THE System SHALL apply all spacing, typography, color, and elevation values exclusively from design tokens defined in the project's design system (DESIGN.md), supporting both light and dark modes
7. THE System SHALL use React Hook Form with Zod schema validation for all form handling
8. THE System SHALL use TanStack Table for all data tables with sorting, filtering, and pagination support, displaying 10 rows per page by default with options to select 10, 25, or 50 rows per page
9. WHEN a non-validation operation succeeds or a server error occurs, THE System SHALL display a toast notification indicating the outcome rather than inline messages

### Requirement 24: Responsive Layout

**User Story:** As a user, I want to access the system from different devices, so that I can use it on desktop and mobile.

#### Acceptance Criteria

1. WHILE the viewport width is 1024px or above, THE System SHALL display navigation in a fixed sidebar layout with menu items, user info, and app branding
2. WHILE the viewport width is below 1024px, THE System SHALL collapse the sidebar into a hamburger menu icon that opens as a drawer overlay from the left side, and SHALL close the drawer when the user taps outside the drawer area, presses the Escape key, or selects a menu item
3. THE System SHALL render all pages and components without horizontal page-level scrolling on viewports from 320px to 1919px wide
4. WHILE the viewport width is below 1024px, THE System SHALL enable horizontal scrolling within data table containers while keeping the page-level layout free of horizontal overflow
5. WHILE the viewport width is below 1024px, THE System SHALL ensure all interactive elements (buttons, links, form inputs) have a minimum touch target size of 44x44 CSS pixels

### Requirement 25: Divisi Assignment

**User Story:** As a Satker, I want to set my divisi after registration, so that my tickets are associated with the correct organizational unit.

#### Acceptance Criteria

1. THE Auth_Service SHALL not require or accept a divisi field during registration
2. WHEN a Satker accesses the profile settings and their divisi field is empty, THE System SHALL display a persistent prompt or highlight indicating the divisi field needs to be filled until the field is set
3. WHEN a Satker updates their divisi in profile settings, THE Profile_Service SHALL save the divisi value (1-100 characters, non-blank)
4. IF a Satker attempts to create a ticket without having set their divisi, THEN THE Ticket_Service SHALL reject the creation and redirect the Satker to profile settings with a message to complete their divisi first

### Requirement 26: Ticket List and Detail Views

**User Story:** As a user, I want to browse and view ticket details, so that I can track and manage support requests.

#### Acceptance Criteria

1. WHEN a Satker accesses the "Tiket Saya" page, THE System SHALL display a paginated table (10 rows per page by default) of the Satker's own tickets sorted by tanggalBuat descending, with columns: nomorTiket, judul, kategori, status, tanggalBuat, and action column with "Lihat Detail" button and "Batalkan" button (visible only for tickets in PENDING or PROSES status)
2. WHEN a Bidtekkom accesses the "Semua Tiket" page, THE System SHALL display a paginated table (10 rows per page by default) of all tickets sorted by tanggalBuat descending, with columns: nomorTiket, judul, namaSatker, divisiSatker, status, tanggalBuat, and action column with "Lihat Detail" button and "Assign" button (visible only for tickets in PENDING status)
3. WHEN a Padal accesses the "Tiket Saya" page, THE System SHALL display a paginated table (10 rows per page by default) of tickets assigned to the Padal sorted by tanggalAssign descending, with columns: nomorTiket, judul, namaSatker, lokasi, status, tanggalAssign, and action column with "Lihat Detail" button and "Selesai" button (visible only for tickets in PROSES status)
4. WHEN a Teknisi accesses the "Tiket" page, THE System SHALL display a read-only paginated table (10 rows per page by default) of tickets from the Teknisi's associated Padal sorted by tanggalAssign descending, with columns: nomorTiket, judul, namaSatker, lokasi, status, tanggalAssign, and a "Lihat Detail" button only
5. WHEN any user views a ticket detail page, THE System SHALL display all ticket information: nomorTiket, judul, deskripsi, kategori, lokasi, namaSatker, divisiSatker, status, tanggalBuat, tanggalAssign (displayed as dash or empty if not yet assigned), tanggalSelesai (displayed as dash or empty if not yet completed), file attachments (downloadable), assigned Padal nama (displayed as dash or empty if not yet assigned), and rating with feedback (if exists)
6. WHEN a Satker views their own completed (SELESAI) ticket that has not been rated, THE System SHALL display a rating form with bintang selection (integer 1-5) and feedback textarea (minimum 1 character, maximum 500 characters) within the ticket detail page
7. IF a user accesses a ticket list page and no tickets match the current view, THEN THE System SHALL display an empty state message indicating no tickets are available

### Requirement 27: Ticket Cancellation

**User Story:** As a Satker or Bidtekkom, I want to cancel a ticket, so that tickets that are no longer needed can be closed.

#### Acceptance Criteria

1. WHEN a Satker requests to cancel their own ticket that is in PENDING or PROSES status, THE Ticket_Service SHALL change the status to DIBATALKAN
2. WHEN a Bidtekkom requests to cancel any ticket that is in PENDING or PROSES status, THE Ticket_Service SHALL change the status to DIBATALKAN
3. IF a cancellation is attempted on a ticket with status SELESAI or DIBATALKAN, THEN THE Ticket_Service SHALL reject the request with an error indicating the ticket cannot be cancelled in its current status
4. WHEN a ticket is cancelled, THE Audit_Service SHALL record the cancellation event with the ticket number, actor ID, cancellation reason (optional, maximum 500 characters), and timestamp
5. WHEN a user clicks the "Batalkan" button, THE System SHALL display a confirmation modal with a description of the cancellation action and an optional reason text field (maximum 500 characters); IF the user confirms, THEN THE System SHALL execute the cancellation; IF the user dismisses the modal, THEN THE System SHALL take no action and return to the previous view
6. IF a Satker attempts to cancel a ticket that they did not create, THEN THE Ticket_Service SHALL reject the request with an authorization error

### Requirement 28: Navigation Menu Structure

**User Story:** As a user, I want clear navigation menus appropriate to my role, so that I can easily find all available features.

#### Acceptance Criteria

1. WHILE a user has the Satker role, THE System SHALL display the following sidebar menu items in this order: Dashboard (ticket overview and alerts), Tiket Saya (list of own tickets with status filter), Buat Tiket (ticket creation form), Notifikasi (notification list with read/unread filter), and Pengaturan (profile, security, and preferences tabs)
2. WHILE a user has the Bidtekkom role, THE System SHALL display the following sidebar menu items in this order: Dashboard (system-wide statistics and charts), Semua Tiket (all tickets with assign action), Manajemen User (user list with role change and soft delete), Manajemen Tim (Padal-Teknisi team associations), Laporan (monthly report with PDF/Excel export), Audit Log (searchable event history), Notifikasi (notification list), Pengaturan Sistem (app name and logo), and Pengaturan (profile, security, and preferences tabs)
3. WHILE a user has the Padal role, THE System SHALL display the following sidebar menu items in this order: Dashboard (workload summary and team), Tiket Saya (assigned tickets with complete action), Laporan (monthly report filtered to own tickets), Tim Saya (read-only view of assigned Teknisi), Notifikasi (notification list), and Pengaturan (profile, security, and preferences tabs)
4. WHILE a user has the Teknisi role, THE System SHALL display the following sidebar menu items in this order: Dashboard (read-only ticket summary), Tiket (read-only ticket list from associated Padal), Notifikasi (notification list), and Pengaturan (profile, security, and preferences tabs)
5. THE System SHALL visually distinguish the currently active menu item from inactive items by applying a distinct background color or accent indicator so that the active state is unambiguous at a glance
6. THE System SHALL display the logged-in user's nama, role badge, and profile photo in the sidebar footer area; IF the user has not uploaded a profile photo, THEN THE System SHALL display a circular initials avatar using the first character of the user's nama
7. IF a user's role is changed by a Bidtekkom while the user is logged in, THEN THE System SHALL update the sidebar menu items to reflect the new role upon the user's next page navigation or page reload without requiring a manual logout and login
