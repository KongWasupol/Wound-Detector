# Seed Data Script

This script populates your MongoDB database with example wound analysis data for testing and demonstration purposes.

## Prerequisites

1. Make sure your backend `.env` file is configured with:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - Other required environment variables

2. Ensure you have Node.js installed and dependencies installed:
   ```bash
   cd backend
   npm install
   ```

## How to Use

### Step 1: Navigate to the backend directory
```bash
cd backend
```

### Step 2: Run the seed script
```bash
node scripts/seedData.js
```

### Step 3: Login with the demo account
After running the script, you can login with:
- **Email**: `demo@wounddetector.com`
- **Password**: `demo123456`

## What the Script Does

1. **Creates a test user** (if it doesn't exist):
   - Email: `demo@wounddetector.com`
   - Password: `demo123456`
   - Role: `clinician`

2. **Clears existing analyses** for the demo user (optional - you can comment this out if you want to keep existing data)

3. **Creates 8 example analyses** with:
   - Realistic wound descriptions
   - Severity scores (ranging from 15 to 72)
   - Detailed insights and recommendations
   - Different AI models (gpt-4o, gpt-4o-mini, gpt-4-turbo)
   - Some analyses linked together for symptom tracking

## Example Data Includes

- Superficial abrasion (low severity)
- Moderate laceration (medium severity)
- Chronic ulcer with infection (high severity)
- Burn injury
- Animal wound (dog)
- Post-surgical incision (healing well)
- Pressure ulcer
- Animal health condition (cat)

## Notes

- The script will create placeholder image paths. In a real scenario, these would be actual uploaded images.
- Some analyses are linked together using `symptomId` to demonstrate symptom tracking functionality.
- The script uses realistic medical terminology and recommendations.

## Troubleshooting

If you encounter errors:

1. **MongoDB Connection Error**: 
   - Check your `MONGODB_URI` in the `.env` file
   - Ensure your MongoDB Atlas cluster is accessible

2. **Module Not Found**:
   - Make sure you're running the script from the `backend` directory
   - Ensure all dependencies are installed: `npm install`

3. **User Already Exists**:
   - The script will use the existing user if found
   - To create a fresh user, delete the existing one from your database first

## Customization

You can modify `seedData.js` to:
- Add more example analyses
- Change the test user credentials
- Adjust severity scores and recommendations
- Link different analyses for symptom tracking

