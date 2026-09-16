FoodFresh remaining module updates

Replace these three files in:
frontend/src/

1. Inventory.jsx
   - Adds storage temperature, humidity, storage duration,
     air circulation, light exposure and packaging.
   - Shows these values in the item details modal.

2. FoodBatches.jsx
   - Makes + Add Batch functional.
   - Adds batch registration form.
   - Includes temperature and humidity in batch details.

3. Reports.jsx
   - Excel-compatible .xls export.
   - PDF/Print export using the browser print dialog.

No new npm packages are required.
Keep the existing CSS files unchanged.
