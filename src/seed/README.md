# Service Types Migration Script

This script helps migrate hardcoded service types from the ServiceRequests.jsx file to the Firebase `service_types` collection.

## Purpose

The application currently has hardcoded service types in various places. This script extracts these types and adds them to the database, ensuring a smooth transition away from hardcoded values while preserving all existing options.

## What the Script Does

1. Extracts hardcoded service types from the application
2. Checks for existing service types in the Firebase `service_types` collection
3. Extracts category values from the `available_services` collection
4. Combines all unique service types
5. Adds any missing service types to the Firebase `service_types` collection

## How to Run

1. First, install the ESM package for running ES modules in Node:
   ```
   npm install esm --save-dev
   ```

2. Run the script:
   ```
   npm run seed-service-types
   ```

3. The script will output:
   - The existing service types found in the database
   - The service categories found in the available_services collection
   - Each new service type as it's added
   - A summary of how many new service types were added

## After Running

Once the script has successfully run, all service types (including previously hardcoded ones) will be available in the database. The application will use these database values instead of hardcoded values, providing a more flexible and manageable approach.

## Notes

- The script is safe to run multiple times as it checks for existing service types before adding new ones
- Service type names are case-sensitive in the UI but case-insensitive for duplicate checking