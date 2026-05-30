-- Store which add-on options the customer selected (by label at booking time).
-- Using TEXT[] so the names are human-readable in the admin and exports, and
-- the values remain stable even if an admin later renames or deletes an option.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS add_on_labels TEXT[] DEFAULT NULL;
