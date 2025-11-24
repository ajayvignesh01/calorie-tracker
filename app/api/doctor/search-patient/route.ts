import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('=== Search Patient API Called ===')

  let body: { patientId?: string } = {}

  try {
    // Step 1: Parse request body
    console.log('Step 1: Parsing request body...')
    const text = await request.text()
    console.log('Raw body:', text)
    body = JSON.parse(text)
    console.log('Parsed body:', body)
  } catch (err) {
    console.error('Failed to parse request body:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const { patientId } = body
    console.log('Step 2: Patient ID:', patientId)

    // Step 3: Create supabase client
    console.log('Step 3: Creating supabase client...')
    const supabase = await createClient()
    console.log('Supabase client created')

    // Step 4: Get current user
    console.log('Step 4: Getting current user...')
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
    console.log('Current user:', user?.id, 'Error:', userError)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 5: Create admin client
    console.log('Step 5: Creating admin client...')
    const adminClient = createAdminClient()
    console.log('Admin client created')

    // Step 6: Check doctor role
    console.log('Step 6: Checking doctor role...')
    const { data: doctorProfile, error: doctorError } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    console.log('Doctor profile:', doctorProfile, 'Error:', doctorError)

    if (!doctorProfile || doctorProfile.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized - Doctors only' }, { status: 403 })
    }

    // Step 7: Validate patient ID
    console.log('Step 7: Validating patient ID...')
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 })
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)
    if (!isUuid) {
      return NextResponse.json({ error: 'Invalid patient ID format' }, { status: 400 })
    }
    console.log('Patient ID is valid UUID')

    // Step 8: Search for patient
    console.log('Step 8: Searching for patient...')
    const { data: patient, error } = await adminClient
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('id', patientId)
      .eq('role', 'user')
      .single()
    console.log('Patient search result:', patient, 'Error:', error)

    if (error || !patient) {
      return NextResponse.json({ error: 'No patient found with that ID' }, { status: 404 })
    }

    console.log('Step 9: Returning success response')
    return NextResponse.json({
      id: patient.id,
      full_name: patient.full_name
    })
  } catch (err) {
    console.error('Search patient error:', err)
    return NextResponse.json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}
