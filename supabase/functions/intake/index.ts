import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface IncomingVacancy {
  adzuna_id: string;
  title: string;
  description?: string;
  school_name: string;
  location?: {
    city?: string;
    province?: string;
    country?: string;
  };
  date_posted?: string;
  status?: string;
  apply_url?: string;
  category?: string;
  contract_type?: string;
  contract_time?: string;
  salary_min?: number;
  salary_max?: number;
  raw_json?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Received intake payload:', body);

    // Handle both single item and array
    const items: IncomingVacancy[] = Array.isArray(body) ? body : [body];
    
    let processed = 0;
    let accepted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        processed++;

        // Validate required fields
        if (!item.adzuna_id || !item.title || !item.school_name) {
          skipped++;
          errors.push(`Missing required fields for item: ${item.adzuna_id || 'unknown'}`);
          continue;
        }

        // Normalize school name
        const normalizedSchoolName = item.school_name.trim();
        
        // Check if school exists, create if not
        let { data: existingSchool } = await supabase
          .from('schools')
          .select('id')
          .eq('name', normalizedSchoolName)
          .single();

        let schoolId: string;

        if (!existingSchool) {
          // Create new school
          const { data: newSchool, error: schoolError } = await supabase
            .from('schools')
            .insert({
              name: normalizedSchoolName,
              city: item.location?.city || null,
              province: item.location?.province || null,
              country: item.location?.country || null,
            })
            .select('id')
            .single();

          if (schoolError) {
            throw new Error(`Failed to create school: ${schoolError.message}`);
          }

          schoolId = newSchool.id;
          console.log('Created new school:', normalizedSchoolName);
        } else {
          schoolId = existingSchool.id;
        }

        // Check if vacancy already exists (dedupe by adzuna_id)
        const { data: existingVacancy } = await supabase
          .from('vacancies')
          .select('id')
          .eq('adzuna_id', item.adzuna_id)
          .single();

        if (existingVacancy) {
          // Update existing vacancy
          const { error: updateError } = await supabase
            .from('vacancies')
            .update({
              title: item.title,
              description: item.description || null,
              status: item.status || 'new',
              apply_url: item.apply_url || null,
              category: item.category || null,
              contract_type: item.contract_type || null,
              contract_time: item.contract_time || null,
              salary_min: item.salary_min || null,
              salary_max: item.salary_max || null,
              date_posted: item.date_posted ? new Date(item.date_posted).toISOString() : null,
              raw_json: item.raw_json || item,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingVacancy.id);

          if (updateError) {
            throw new Error(`Failed to update vacancy: ${updateError.message}`);
          }

          console.log('Updated existing vacancy:', item.adzuna_id);
        } else {
          // Create new vacancy
          const { error: vacancyError } = await supabase
            .from('vacancies')
            .insert({
              adzuna_id: item.adzuna_id,
              title: item.title,
              description: item.description || null,
              school_id: schoolId,
              status: item.status || 'new',
              apply_url: item.apply_url || null,
              category: item.category || null,
              contract_type: item.contract_type || null,
              contract_time: item.contract_time || null,
              salary_min: item.salary_min || null,
              salary_max: item.salary_max || null,
              date_posted: item.date_posted ? new Date(item.date_posted).toISOString() : null,
              raw_json: item.raw_json || item,
            });

          if (vacancyError) {
            throw new Error(`Failed to create vacancy: ${vacancyError.message}`);
          }

          console.log('Created new vacancy:', item.adzuna_id);
        }

        accepted++;

      } catch (error) {
        skipped++;
        errors.push(`Error processing ${item.adzuna_id}: ${error.message}`);
        console.error('Error processing item:', error);
      }
    }

    const response = {
      success: true,
      processed,
      accepted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log('Intake completed:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Intake error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});