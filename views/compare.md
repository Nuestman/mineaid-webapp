CREATE TABLE inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Medication', 'Consumable', 'Equipment')),
    unit TEXT NOT NULL, -- e.g., "tablets", "ml", "pieces"
    reorder_level INTEGER DEFAULT 0, -- Minimum stock level before alerts are triggered
    expiry_date DATE, -- For items that expire
    service_date DATE, -- For equipment needing regular servicing
    initial_stock INTEGER DEFAULT 0, -- Starting stock when item is added
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE inventory_daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL, -- Foreign key to inventory_items
    log_date DATE NOT NULL DEFAULT (DATE('now')), -- Date of the log entry
    stock_start INTEGER NOT NULL, -- Stock at the start of the day
    stock_used INTEGER DEFAULT 0, -- Stock used during the day
    stock_added INTEGER DEFAULT 0, -- Stock added during the day (restocks)
    stock_end INTEGER NOT NULL, -- Stock at the end of the day
    remarks TEXT, -- Any additional comments or notes
    logged_by INTEGER NOT NULL, -- User ID of the person making the entry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items (id),
    FOREIGN KEY (logged_by) REFERENCES users (id)
);


CREATE TABLE inventory_monthly_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL, -- Foreign key to inventory_items
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    stock_start INTEGER NOT NULL, -- Stock at the start of the month
    stock_used INTEGER DEFAULT 0, -- Total stock used during the month
    stock_added INTEGER DEFAULT 0, -- Total stock added during the month
    stock_end INTEGER NOT NULL, -- Stock at the end of the month
    remarks TEXT, -- Any observations or notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items (id)
);


CREATE TABLE inventory_audit_trail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL, -- Foreign key to inventory_items
    action TEXT NOT NULL CHECK (action IN ('ADD', 'EDIT', 'DELETE', 'RESTOCK')),
    changes TEXT NOT NULL, -- Description of the changes made
    performed_by INTEGER NOT NULL, -- User ID of the person performing the action
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items (id),
    FOREIGN KEY (performed_by) REFERENCES users (id)
);


CREATE TABLE inventory_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- e.g., 'Medication', 'Consumable', 'Equipment'
    description TEXT, -- Optional description of the category
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


Relationships Between Tables

    inventory_items → inventory_daily_logs: One item can have many daily logs.
    inventory_items → inventory_monthly_summaries: One item can have one summary per month.
    inventory_items → inventory_audit_trail: One item can have multiple audit trail records.

