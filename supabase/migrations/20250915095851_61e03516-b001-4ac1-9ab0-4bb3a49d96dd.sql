-- Fix critical security vulnerability: Implement proper RLS policies for contacts and engagements tables
-- This replaces the overly permissive "true" policies with authentication-based access control

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all operations on engagements" ON public.engagements;
DROP POLICY IF EXISTS "Allow all operations on schools" ON public.schools;
DROP POLICY IF EXISTS "Allow all operations on vacancies" ON public.vacancies;

-- Create secure RLS policies for contacts table (requires authentication)
CREATE POLICY "Authenticated users can view contacts" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create contacts" 
ON public.contacts 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts" 
ON public.contacts 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contacts" 
ON public.contacts 
FOR DELETE 
TO authenticated
USING (true);

-- Create secure RLS policies for engagements table (requires authentication)
CREATE POLICY "Authenticated users can view engagements" 
ON public.engagements 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create engagements" 
ON public.engagements 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update engagements" 
ON public.engagements 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete engagements" 
ON public.engagements 
FOR DELETE 
TO authenticated
USING (true);

-- Keep schools and vacancies publicly readable as they are business listings
CREATE POLICY "Anyone can view schools" 
ON public.schools 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can modify schools" 
ON public.schools 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view vacancies" 
ON public.vacancies 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can modify vacancies" 
ON public.vacancies 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);