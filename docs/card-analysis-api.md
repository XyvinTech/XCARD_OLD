# Business Card Analysis API Documentation

## Overview

The Business Card Analysis feature allows users to upload images of business cards and automatically extract contact information using OCR (Optical Character Recognition) technology. The system extracts key information such as names, phone numbers, email addresses, websites, business names, and addresses.

## Features

- **OCR Processing**: Uses Tesseract.js for accurate text extraction
- **Smart Data Parsing**: Intelligently identifies and categorizes different types of information
- **Firebase Storage Integration**: Securely stores uploaded card images
- **Profile Integration**: Allows saving extracted data directly to user profiles
- **Analysis History**: Maintains a history of all analyzed cards
- **Selective Data Saving**: Users can choose which fields to save to their profile

## API Endpoints

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### 1. Analyze Business Card

**Endpoint:** `POST /api/v1/cardanalysis/analyze`

**Description:** Upload and analyze a business card image using OCR

**Content-Type:** `multipart/form-data`

**Request Parameters:**
- `cardImage` (File, required): Business card image file (JPG, PNG, etc.)
  - Maximum file size: 10MB
  - Supported formats: All image types

**Request Example:**
```javascript
const formData = new FormData();
formData.append('cardImage', imageFile);

const response = await fetch('/api/v1/cardanalysis/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData
});
```

**Response Example:**
```json
{
  "success": true,
  "message": {
    "success": "Card analyzed successfully"
  },
  "data": {
    "id": "647a1b2c3d4e5f6789012345",
    "extractedData": {
      "name": "John Doe",
      "phoneNumber": "+1-555-123-4567",
      "email": "john.doe@company.com",
      "address": "123 Business St, New York, NY 10001",
      "website": "https://www.company.com",
      "business": "ABC COMPANY LLC"
    },
    "rawOcrText": "John Doe\nABC COMPANY LLC\n+1-555-123-4567\njohn.doe@company.com\n123 Business St\nNew York, NY 10001\nwww.company.com",
    "confidence": 94.5,
    "processingTime": 3420,
    "originalImage": {
      "key": "card-analysis/card-analysis-abc123.jpg",
      "fileName": "card-analysis-abc123.jpg",
      "contentType": "image/jpeg",
      "public": "https://storage.googleapis.com/...",
      "link": "https://storage.googleapis.com/..."
    }
  }
}
```

### 2. Save Card Data to Profile

**Endpoint:** `POST /api/v1/cardanalysis/save`

**Description:** Save selected extracted data to a user profile

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "analysisId": "647a1b2c3d4e5f6789012345",
  "profileId": "647a1b2c3d4e5f6789012346", // Optional: if not provided, creates new profile
  "selectedFields": {
    "name": true,
    "phoneNumber": true,
    "email": true,
    "address": false,
    "website": true,
    "business": true
  }
}
```

**Request Example:**
```javascript
const response = await fetch('/api/v1/cardanalysis/save', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    analysisId: analysisId,
    profileId: profileId, // Optional
    selectedFields: {
      name: true,
      phoneNumber: true,
      email: true,
      address: true,
      website: true,
      business: true
    }
  })
});
```

**Response Example:**
```json
{
  "success": true,
  "message": {
    "success": "Card data saved to profile successfully"
  },
  "data": {
    "profileId": "647a1b2c3d4e5f6789012346",
    "savedFields": {
      "name": true,
      "phoneNumber": true,
      "email": true,
      "address": true,
      "website": true,
      "business": true
    },
    "analysisId": "647a1b2c3d4e5f6789012345"
  }
}
```

### 3. Get Analysis History

**Endpoint:** `GET /api/v1/cardanalysis/history`

**Description:** Retrieve user's card analysis history with pagination

**Query Parameters:**
- `page` (Number, optional): Page number (default: 1)
- `limit` (Number, optional): Items per page (default: 10)

**Request Example:**
```javascript
const response = await fetch('/api/v1/cardanalysis/history?page=1&limit=10', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response Example:**
```json
{
  "success": true,
  "message": {
    "success": "Analysis history fetched successfully"
  },
  "data": {
    "analyses": [
      {
        "_id": "647a1b2c3d4e5f6789012345",
        "extractedData": {
          "name": "John Doe",
          "phoneNumber": "+1-555-123-4567",
          "email": "john.doe@company.com",
          "address": "123 Business St, New York, NY 10001",
          "website": "https://www.company.com",
          "business": "ABC COMPANY LLC"
        },
        "confidence": 94.5,
        "processingTime": 3420,
        "status": "completed",
        "saved": true,
        "savedToProfile": {
          "_id": "647a1b2c3d4e5f6789012346",
          "profile": {
            "name": "John Doe"
          },
          "card": {
            "theme": "orange&black"
          }
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 3,
      "total": 25
    }
  }
}
```

## Client-Side Implementation Guide

### React Example Implementation

```jsx
import React, { useState } from 'react';

const CardAnalysisComponent = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    name: true,
    phoneNumber: true,
    email: true,
    address: false,
    website: true,
    business: true
  });

  // Step 1: Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  // Step 2: Analyze the card
  const analyzeCard = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('cardImage', selectedFile);

    try {
      const response = await fetch('/api/v1/cardanalysis/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult(result.data);
      } else {
        alert('Analysis failed: ' + result.message);
      }
    } catch (error) {
      alert('Error analyzing card: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save selected data to profile
  const saveToProfile = async (profileId = null) => {
    if (!analysisResult) return;

    try {
      const response = await fetch('/api/v1/cardanalysis/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisId: analysisResult.id,
          profileId: profileId,
          selectedFields: selectedFields
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Data saved to profile successfully!');
      } else {
        alert('Save failed: ' + result.message);
      }
    } catch (error) {
      alert('Error saving data: ' + error.message);
    }
  };

  return (
    <div className="card-analysis">
      {/* File Upload */}
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
        />
        <button 
          onClick={analyzeCard} 
          disabled={!selectedFile || loading}
        >
          {loading ? 'Analyzing...' : 'Analyze Card'}
        </button>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="results-section">
          <h3>Extracted Information</h3>
          <p><strong>Confidence:</strong> {analysisResult.confidence}%</p>
          <p><strong>Processing Time:</strong> {analysisResult.processingTime}ms</p>
          
          {/* Extracted Fields */}
          <div className="extracted-fields">
            {Object.entries(analysisResult.extractedData).map(([field, value]) => (
              <div key={field} className="field-row">
                <input
                  type="checkbox"
                  checked={selectedFields[field]}
                  onChange={(e) => setSelectedFields({
                    ...selectedFields,
                    [field]: e.target.checked
                  })}
                />
                <label><strong>{field}:</strong> {value}</label>
              </div>
            ))}
          </div>

          {/* Raw OCR Text */}
          <details>
            <summary>Raw OCR Text</summary>
            <pre>{analysisResult.rawOcrText}</pre>
          </details>

          {/* Save Button */}
          <button onClick={() => saveToProfile()}>
            Save to New Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default CardAnalysisComponent;
```

### JavaScript (Vanilla) Example

```javascript
class CardAnalyzer {
  constructor(token) {
    this.token = token;
    this.baseUrl = '/api/v1/cardanalysis';
  }

  async analyzeCard(imageFile) {
    const formData = new FormData();
    formData.append('cardImage', imageFile);

    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    return await response.json();
  }

  async saveCardData(analysisId, selectedFields, profileId = null) {
    const response = await fetch(`${this.baseUrl}/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysisId,
        profileId,
        selectedFields
      })
    });

    return await response.json();
  }

  async getHistory(page = 1, limit = 10) {
    const response = await fetch(`${this.baseUrl}/history?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return await response.json();
  }
}

// Usage Example
const analyzer = new CardAnalyzer(userToken);

// Analyze a card
const result = await analyzer.analyzeCard(imageFile);
console.log('Extracted data:', result.data.extractedData);

// Save selected fields
await analyzer.saveCardData(result.data.id, {
  name: true,
  phoneNumber: true,
  email: true,
  address: false,
  website: true,
  business: true
});
```

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Please upload a card image"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Not authorized to access this analysis"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Card analysis not found"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Failed to analyze card"
}
```

### Error Handling Best Practices

1. **Always check response status:**
```javascript
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
```

2. **Handle network errors:**
```javascript
try {
  const result = await analyzeCard(file);
} catch (error) {
  if (error.name === 'NetworkError') {
    // Handle network issues
  } else {
    // Handle other errors
  }
}
```

3. **Validate file before upload:**
```javascript
const validateFile = (file) => {
  if (!file) return 'No file selected';
  if (!file.type.startsWith('image/')) return 'File must be an image';
  if (file.size > 10 * 1024 * 1024) return 'File size must be less than 10MB';
  return null;
};
```

## Usage Flow

### Typical Implementation Flow

1. **User selects image file**
   - Validate file type and size
   - Show preview if needed

2. **Upload and analyze**
   - Show loading indicator
   - Call `/analyze` endpoint
   - Handle progress if needed

3. **Display results**
   - Show extracted fields
   - Allow user to select which fields to save
   - Display confidence level and raw OCR text

4. **Save to profile**
   - Let user choose existing profile or create new
   - Call `/save` endpoint with selected fields
   - Show success/error message

5. **History management**
   - Allow users to view past analyses
   - Show saved status
   - Link to associated profiles

## Best Practices

### Performance Optimization

1. **Image preprocessing:**
   - Resize large images before upload
   - Convert to optimal format (JPEG for photos)
   - Compress images to reduce upload time

2. **Progress indication:**
   - Show upload progress
   - Display processing status
   - Provide estimated completion time

3. **Caching:**
   - Cache analysis results locally
   - Avoid re-analyzing same images

### User Experience

1. **Clear feedback:**
   - Show confidence levels
   - Highlight uncertain extractions
   - Allow manual corrections

2. **Flexible saving:**
   - Let users choose which fields to save
   - Allow editing before saving
   - Provide profile selection options

3. **Error recovery:**
   - Provide retry mechanisms
   - Offer manual data entry fallback
   - Clear error messages

### Security Considerations

1. **File validation:**
   - Verify file types on client and server
   - Limit file sizes
   - Scan for malicious content

2. **Data privacy:**
   - Inform users about data storage
   - Provide deletion options
   - Handle sensitive information carefully

3. **Rate limiting:**
   - Implement client-side throttling
   - Handle rate limit responses gracefully
   - Queue multiple requests appropriately

## Testing

### Unit Testing Example

```javascript
describe('Card Analysis API', () => {
  test('should analyze card successfully', async () => {
    const mockFile = new File([''], 'business-card.jpg', { type: 'image/jpeg' });
    const result = await cardAnalyzer.analyzeCard(mockFile);
    
    expect(result.success).toBe(true);
    expect(result.data.extractedData).toBeDefined();
    expect(result.data.rawOcrText).toBeDefined();
  });

  test('should save card data to profile', async () => {
    const result = await cardAnalyzer.saveCardData('analysisId', {
      name: true,
      email: true
    });
    
    expect(result.success).toBe(true);
    expect(result.data.profileId).toBeDefined();
  });
});
```

### Integration Testing

Test the complete flow from upload to saving:
1. Upload various card image formats
2. Verify OCR accuracy with known cards
3. Test profile integration
4. Validate error handling scenarios

This documentation provides everything needed for client-side developers to successfully implement the Business Card Analysis feature in their applications. 