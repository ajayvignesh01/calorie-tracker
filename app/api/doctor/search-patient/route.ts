import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify the requester is a doctor
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to check doctor role (bypasses RLS)
  const adminClient = createAdminClient()

  const { data: doctorProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!doctorProfile || doctorProfile.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized - Doctors only' }, { status: 403 })
  }

  // Get patient ID from request
  const { patientId } = await request.json()

  if (!patientId) {
    return NextResponse.json({ error: 'Patient ID required' }, { status: 400 })
  }

  // Validate UUID format
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)
  if (!isUuid) {
    return NextResponse.json({ error: 'Invalid patient ID format' }, { status: 400 })
  }

  // Search for the patient using admin client (bypasses RLS)
  const { data: patient, error } = await adminClient
    .from('user_profiles')
    .select('id, full_name, role')
    .eq('id', patientId)
    .eq('role', 'user')
    .single()

  if (error || !patient) {
    return NextResponse.json({ error: 'No patient found with that ID' }, { status: 404 })
  }

  return NextResponse.json({
    id: patient.id,
    full_name: patient.full_name
  })
}
