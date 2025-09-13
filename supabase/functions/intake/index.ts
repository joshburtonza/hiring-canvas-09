import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuration constants
const CONFIG = {
  MAX_BATCH_SIZE: 1000,
  CHUNK_SIZE: 50,
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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

interface BatchResult {
  success: boolean;
  processed: number;
  accepted: number;
  skipped: number;
  total_chunks?: number;
  processing_time_ms: number;
  items_per_second?: number;
  errors?: string[];
  timestamp: string;
}

// Rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Validation functions
function validateRequestSize(contentLength: string | null): boolean {
  if (!contentLength) return true;
  return parseInt(contentLength) <= CONFIG.MAX_REQUEST_SIZE;
}

function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get('x-api-key');
  // For now, just check if header exists - in production, validate against stored keys
  return apiKey !== null;
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const client = rateLimitStore.get(clientId);
  
  if (!client || now > client.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + CONFIG.RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (client.count >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  client.count++;
  return true;
}

function validateVacancy(item: any): string[] {
  const errors: string[] = [];
  
  if (!item.adzuna_id) errors.push('Missing adzuna_id');
  if (!item.title) errors.push('Missing title');
  if (!item.school_name) errors.push('Missing school_name');
  
  return errors;
}

// School processing functions
async function findOrCreateSchool(supabase: any, item: IncomingVacancy): Promise<string> {
  const normalizedSchoolName = item.school_name.trim();
  
  // Check if school exists
  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('name', normalizedSchoolName)
    .single();

  if (existingSchool) {
    return existingSchool.id;
  }

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

  console.log('Created new school:', normalizedSchoolName);
  return newSchool.id;
}

// Vacancy processing functions
async function upsertVacancy(supabase: any, item: IncomingVacancy, schoolId: string): Promise<'created' | 'updated'> {
  // Check if vacancy already exists
  const { data: existingVacancy } = await supabase
    .from('vacancies')
    .select('id')
    .eq('adzuna_id', item.adzuna_id)
    .single();

  const vacancyData = {
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
  };

  if (existingVacancy) {
    const { error: updateError } = await supabase
      .from('vacancies')
      .update(vacancyData)
      .eq('id', existingVacancy.id);

    if (updateError) {
      throw new Error(`Failed to update vacancy: ${updateError.message}`);
    }

    return 'updated';
  } else {
    const { error: vacancyError } = await supabase
      .from('vacancies')
      .insert({
        adzuna_id: item.adzuna_id,
        school_id: schoolId,
        ...vacancyData,
      });

    if (vacancyError) {
      throw new Error(`Failed to create vacancy: ${vacancyError.message}`);
    }

    return 'created';
  }
}

// Chunk processing function
async function processChunk(supabase: any, chunk: IncomingVacancy[]): Promise<{
  processed: number;
  accepted: number;
  skipped: number;
  errors: string[];
}> {
  let processed = 0;
  let accepted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of chunk) {
    try {
      processed++;

      // Validate item
      const validationErrors = validateVacancy(item);
      if (validationErrors.length > 0) {
        skipped++;
        errors.push(`Validation failed for ${item.adzuna_id || 'unknown'}: ${validationErrors.join(', ')}`);
        continue;
      }

      // Process school and vacancy
      const schoolId = await findOrCreateSchool(supabase, item);
      const operation = await upsertVacancy(supabase, item, schoolId);
      
      console.log(`${operation} vacancy:`, item.adzuna_id);
      accepted++;

    } catch (error) {
      skipped++;
      errors.push(`Error processing ${item.adzuna_id}: ${error.message}`);
      console.error('Error processing item:', error);
    }
  }

  return { processed, accepted, skipped, errors };
}

serve(async (req) => {
  const startTime = Date.now();
  
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
    // Validate request size
    const contentLength = req.headers.get('content-length');
    if (!validateRequestSize(contentLength)) {
      return new Response(
        JSON.stringify({ error: 'Request too large', max_size: CONFIG.MAX_REQUEST_SIZE }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check API key (optional but recommended for production)
    const clientId = req.headers.get('x-api-key') || req.headers.get('x-forwarded-for') || 'anonymous';
    
    // Rate limiting
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          limit: CONFIG.RATE_LIMIT_MAX_REQUESTS,
          window_ms: CONFIG.RATE_LIMIT_WINDOW
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Received intake payload with', Array.isArray(body) ? body.length : 1, 'items');

    // Handle both single item and array
    const items: IncomingVacancy[] = Array.isArray(body) ? body : [body];
    
    // Validate batch size
    if (items.length > CONFIG.MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: 'Batch too large', 
          received: items.length,
          max_allowed: CONFIG.MAX_BATCH_SIZE
        }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process in chunks for better performance
    const chunks = [];
    for (let i = 0; i < items.length; i += CONFIG.CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CONFIG.CHUNK_SIZE));
    }

    let totalProcessed = 0;
    let totalAccepted = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    console.log(`Processing ${items.length} items in ${chunks.length} chunks`);

    // Process chunks sequentially to avoid overwhelming the database
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);
      
      const chunkResult = await processChunk(supabase, chunk);
      
      totalProcessed += chunkResult.processed;
      totalAccepted += chunkResult.accepted;
      totalSkipped += chunkResult.skipped;
      allErrors.push(...chunkResult.errors);
    }

    const processingTime = Date.now() - startTime;
    const itemsPerSecond = totalProcessed > 0 ? Math.round((totalProcessed / processingTime) * 1000) : 0;

    const response: BatchResult = {
      success: true,
      processed: totalProcessed,
      accepted: totalAccepted,
      skipped: totalSkipped,
      total_chunks: chunks.length,
      processing_time_ms: processingTime,
      items_per_second: itemsPerSecond,
      errors: allErrors.length > 0 ? allErrors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log('Batch intake completed:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Intake error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});