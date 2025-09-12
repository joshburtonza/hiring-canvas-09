-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  website TEXT,
  type TEXT,
  phases TEXT[],
  subjects TEXT[],
  country TEXT,
  province TEXT,
  city TEXT,
  address TEXT,
  source_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vacancies table
CREATE TABLE public.vacancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  adzuna_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  contract_type TEXT,
  contract_time TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  date_posted TIMESTAMP WITH TIME ZONE,
  apply_url TEXT,
  status TEXT DEFAULT 'new',
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role_title TEXT,
  department TEXT,
  email TEXT,
  email_confidence INTEGER DEFAULT 0,
  phone TEXT,
  linkedin_url TEXT,
  source_url TEXT,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create engagements table
CREATE TABLE public.engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  status TEXT DEFAULT 'pending',
  owner TEXT,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  last_touch_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth mentioned in requirements)
CREATE POLICY "Allow all operations on schools" ON public.schools FOR ALL USING (true);
CREATE POLICY "Allow all operations on vacancies" ON public.vacancies FOR ALL USING (true);
CREATE POLICY "Allow all operations on contacts" ON public.contacts FOR ALL USING (true);
CREATE POLICY "Allow all operations on engagements" ON public.engagements FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_schools_name_trgm ON public.schools USING GIN (name gin_trgm_ops);
CREATE INDEX idx_vacancies_school_status_date ON public.vacancies (school_id, status, date_posted DESC);
CREATE INDEX idx_contacts_school_id ON public.contacts (school_id);
CREATE INDEX idx_engagements_school_id ON public.engagements (school_id);
CREATE INDEX idx_engagements_contact_id ON public.engagements (contact_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vacancies_updated_at
  BEFORE UPDATE ON public.vacancies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_engagements_updated_at
  BEFORE UPDATE ON public.engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();