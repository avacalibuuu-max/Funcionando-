-- Create table for service records
CREATE TABLE IF NOT EXISTS service_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_address TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_company TEXT NOT NULL,
  service_description TEXT NOT NULL,
  service_value DECIMAL(10,2) NOT NULL,
  warranty_months INTEGER NOT NULL,
  observations TEXT,
  service_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_service_records_client_name ON service_records(client_name);
CREATE INDEX IF NOT EXISTS idx_service_records_client_phone ON service_records(client_phone);
CREATE INDEX IF NOT EXISTS idx_service_records_service_date ON service_records(service_date);
CREATE INDEX IF NOT EXISTS idx_service_records_created_at ON service_records(created_at);
