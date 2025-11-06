# Design Document

## Overview

This design document outlines the enhancement of the client auto-check feature for the Job Card Creation page. The feature will provide real-time feedback when users enter a 10-digit mobile number, automatically checking if a client exists in the system and providing visual feedback to improve user experience and prevent duplicate client creation.

## Architecture

### Component Architecture

```
CreateJobCard Component
├── Mobile Number Input Field
├── Client Check Status Component (New)
│   ├── Loading State
│   ├── Success State (Client Found)
│   ├── Info State (New Client)
│   └── Error State
├── Auto-populated Client Fields
└── Form Submission Logic
```

### Data Flow

1. **User Input**: User types in mobile number field
2. **Validation**: Check if input is exactly 10 digits
3. **API Call**: Trigger `checkClientExists` API call
4. **State Management**: Update component state with API response
5. **UI Update**: Display appropriate status message and auto-populate fields
6. **User Interaction**: Allow user to modify auto-populated data

## Components and Interfaces

### 1. Client Check Status Component

A new reusable component to display the status of client checking:

```typescript
interface ClientCheckStatusProps {
  status: 'idle' | 'loading' | 'found' | 'not-found' | 'error';
  clientName?: string;
  error?: string;
}

const ClientCheckStatus: React.FC<ClientCheckStatusProps> = ({
  status,
  clientName,
  error
}) => {
  // Render different states with appropriate icons and messages
};
```

### 2. Enhanced Mobile Input Component

Extend the existing mobile input with client checking functionality:

```typescript
interface MobileInputProps {
  value: string;
  onChange: (value: string) => void;
  onClientCheck: (mobile: string) => void;
  checkStatus: ClientCheckStatus;
}
```

### 3. State Management Interface

```typescript
interface ClientCheckState {
  status: 'idle' | 'loading' | 'found' | 'not-found' | 'error';
  clientData?: Client;
  error?: string;
  lastCheckedMobile?: string;
}
```

## Data Models

### Client Check API Response

The existing API endpoint `/api/v1/jobcards/check-client/` returns:

```typescript
interface ClientCheckResponse {
  exists: boolean;
  client?: {
    id: number;
    full_name: string;
    mobile: string;
    email: string;
    city: string;
    address: string;
    notes?: string;
    is_active: boolean;
  };
}
```

### Form Data Structure

The existing `JobCardFormData` interface will be used with auto-population logic:

```typescript
interface JobCardFormData {
  client_name: string;
  client_mobile: string;
  client_email: string;
  client_city: string;
  client_address: string;
  // ... other fields
}
```

## Error Handling

### Error Scenarios and Responses

1. **Network Error**: Display "Unable to check client. Please continue with manual entry."
2. **API Timeout**: Display "Client check timed out. Please continue with manual entry."
3. **Server Error**: Display "Client check temporarily unavailable. Please continue with manual entry."
4. **Invalid Mobile Format**: No API call triggered, standard validation applies

### Error Recovery

- All errors are non-blocking - users can continue with form submission
- Error messages are displayed for 5 seconds then auto-hide
- Users can retry by modifying the mobile number

## Testing Strategy

### Unit Tests

1. **Mobile Number Validation**
   - Test 10-digit validation
   - Test non-numeric input handling
   - Test partial input scenarios

2. **API Integration**
   - Test successful client found scenario
   - Test client not found scenario
   - Test API error scenarios
   - Test network timeout scenarios

3. **State Management**
   - Test state transitions
   - Test auto-population logic
   - Test form data persistence

4. **User Interactions**
   - Test field editing after auto-population
   - Test mobile number changes after successful check
   - Test form submission with auto-populated data

### Integration Tests

1. **End-to-End Flow**
   - Complete job card creation with existing client
   - Complete job card creation with new client
   - Error handling during client check

2. **Performance Tests**
   - API response time validation
   - UI responsiveness during API calls

### Visual States Testing

1. **Loading State**: Verify spinner and loading message display
2. **Success State**: Verify client found message and auto-population
3. **Info State**: Verify new client message display
4. **Error State**: Verify error message display and recovery

## Implementation Details

### Debouncing Strategy

To prevent excessive API calls while user is typing:
- No debouncing needed as API call only triggers on exactly 10 digits
- Clear previous check results when mobile number changes

### Caching Strategy

- No client-side caching for client check results
- Rely on server-side caching (existing 5-minute cache for client data)
- Fresh check performed for each 10-digit mobile number entry

### Accessibility Considerations

1. **Screen Reader Support**
   - ARIA labels for status messages
   - ARIA live regions for dynamic status updates
   - Proper focus management

2. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Logical tab order maintained

3. **Visual Indicators**
   - High contrast status indicators
   - Clear visual hierarchy
   - Loading states with appropriate timing

### Performance Optimizations

1. **API Call Optimization**
   - Only trigger on exactly 10 digits
   - Cancel previous requests if new one initiated
   - Implement request timeout (5 seconds)

2. **UI Optimization**
   - Minimal re-renders during status changes
   - Efficient state updates
   - Smooth loading transitions

### Mobile Responsiveness

- Status messages adapt to mobile screen sizes
- Touch-friendly interaction areas
- Appropriate spacing for mobile devices

## Security Considerations

### Data Validation

- Client-side validation for mobile number format
- Server-side validation handled by existing API
- No sensitive data exposed in error messages

### API Security

- Existing JWT authentication maintained
- No additional security requirements
- Rate limiting handled by existing API infrastructure

## Browser Compatibility

- Support for modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Graceful degradation for older browsers
- Progressive enhancement approach

## Monitoring and Analytics

### Success Metrics

- Client check API success rate
- Auto-population usage rate
- Form completion rate improvement
- User error rate reduction

### Error Tracking

- API failure rates
- Network timeout occurrences
- User abandonment after errors

## Future Enhancements

### Potential Improvements

1. **Smart Suggestions**: Show similar clients if exact match not found
2. **Client History**: Display recent interaction history
3. **Bulk Import**: Support for multiple client checks
4. **Offline Support**: Cache recent client checks for offline use

### Scalability Considerations

- Component designed for reuse in other forms
- State management pattern applicable to other auto-check features
- API pattern extensible to other entity checks