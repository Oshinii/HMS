import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  KeyRound,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Pill,
  Pencil,
  Plus,
  Printer,
  LogIn,
  LogOut,
  Save,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  UserRound,
  UsersRound,
  Upload,
  WalletCards,
  X,
} from 'lucide-react'
import { backendStateKeys, checkSession, loadBackendState, saveBackendState, saveStored, signIn, signOut, updatePassword } from './api.js'
import './App.css'

const readStored = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const getInitials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
const sriLankaTimeZone = 'Asia/Colombo'
const formatSriLankaDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: sriLankaTimeZone })
const getSriLankaDateKey = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: sriLankaTimeZone }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}
const shiftDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const formatCalendarDate = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00Z`)
  return { day: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), date: dateKey.slice(8, 10), key: dateKey }
}
const getSriLankaGreeting = (date) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: sriLankaTimeZone }).format(date))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
const getAppointmentDate = (appointment) => {
  if (/^\d{4}-\d{2}-\d{2}/.test(appointment.date || '')) return appointment.date.slice(0, 10)
  if (appointment.day) return `2026-09-${String(appointment.day).padStart(2, '0')}`
  return getSriLankaDateKey(new Date(appointment.createdAt || Date.now()))
}
const formatAppointmentDate = (dateKey) => new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const createMedicalReportPdf = ({ patientName, patientId, doctor, requestedBy, testDate, testedAt, reportNumber, testCategory, category, testName, result, unit, referenceRange, notes }) => {
  const report = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = report.internal.pageSize.getWidth()
  const pageHeight = report.internal.pageSize.getHeight()
  const left = 42
  const blue = [50, 123, 182]
  const drawLetterhead = () => {
    report.setFillColor(...blue)
    report.circle(left + 21, 43, 21, 'F')
    report.setDrawColor(255, 255, 255)
    report.setLineWidth(2)
    report.line(left + 21, 33, left + 21, 53)
    report.line(left + 11, 43, left + 31, 43)
    report.setTextColor(23, 32, 43)
    report.setFont('times', 'bold')
    report.setFontSize(24)
    report.text('Medical', left + 54, 42)
    report.setTextColor(...blue)
    report.setFont('helvetica', 'bold')
    report.setFontSize(8)
    report.text('H E A L T H   C A R E', left + 55, 56)
    report.setTextColor(126, 139, 148)
    report.setFont('helvetica', 'normal')
    report.setFontSize(9)
    report.text('Clinical report', pageWidth - 42, 38, { align: 'right' })
    report.text('Medical Health Care HMS', pageWidth - 42, 52, { align: 'right' })
    report.setFillColor(...blue)
    report.rect(left, 76, pageWidth - left * 2, 3, 'F')
  }

  drawLetterhead()
  report.setTextColor(23, 32, 43)
  report.setFont('helvetica', 'bold')
  report.setFontSize(20)
  report.text('Medical Report', left, 114)
  report.setFont('helvetica', 'normal')
  report.setFontSize(10)

  const details = [
    ['Patient Name', patientName || '--'],
    ['Patient ID', patientId || '--'],
    ['Doctor / Requested by', doctor || requestedBy || '--'],
    ['Report No', reportNumber || '--'],
    ['Test Date', testDate || testedAt || '--'],
  ]
  details.forEach(([label, value], index) => {
    const x = left + (index % 2) * 250
    const y = 148 + Math.floor(index / 2) * 44
    report.setTextColor(139, 149, 158)
    report.text(label, x, y)
    report.setTextColor(23, 32, 43)
    report.setFont('helvetica', 'bold')
    report.text(value, x, y + 15)
    report.setFont('helvetica', 'normal')
  })

  let contentY = 275
  report.setFont('helvetica', 'bold')
  report.setTextColor(...blue)
  report.setFontSize(12)
  report.text('Test results', left, contentY)
  contentY += 18
  report.setFillColor(245, 249, 251)
  report.roundedRect(left, contentY, pageWidth - left * 2, 88, 7, 7, 'F')
  report.setFontSize(10)
  report.setTextColor(139, 149, 158)
  report.text('Test', left + 14, contentY + 22)
  report.text('Result', left + 14, contentY + 48)
  report.text('Reference range', left + 250, contentY + 22)
  report.setFont('helvetica', 'bold')
  report.setTextColor(23, 32, 43)
  report.text(`${testCategory || category || 'Test'}${testName ? ` - ${testName}` : ''}`, left + 80, contentY + 22)
  report.text(`${result || '--'}${unit ? ` ${unit}` : ''}`, left + 80, contentY + 48)
  report.text(referenceRange || '--', left + 250, contentY + 48)
  contentY += 112

  if (notes) {
    const noteLines = report.splitTextToSize(notes, pageWidth - left * 2)
    if (contentY + 42 + noteLines.length * 14 > pageHeight - 60) {
      report.addPage()
      drawLetterhead()
      contentY = 112
    }
    report.setFont('helvetica', 'bold')
    report.setTextColor(...blue)
    report.setFontSize(11)
    report.text('Notes', left, contentY)
    report.setFont('helvetica', 'normal')
    report.setTextColor(74, 88, 98)
    report.setFontSize(10)
    report.text(noteLines, left, contentY + 18)
  }

  report.setFont('helvetica', 'normal')
  report.setFontSize(9)
  report.setTextColor(146, 157, 166)
  report.text('Generated from Medical Health Care HMS', left, pageHeight - 34)
  report.text('Signature / Authorized medical department', pageWidth - left, pageHeight - 34, { align: 'right' })
  const fileName = [patientName, testName, testDate]
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
  report.save(`${fileName || 'patient-medical-report'}.pdf`)
}
const upsertMedicalRecord = (records, record) => {
  const patientId = String(record.patientId || '').trim()
  const patientName = String(record.patient || '').trim()
  const isSamePatient = (existing) => {
    const existingId = String(existing.patientId || '').trim()
    if (patientId && existingId) return patientId.toLowerCase() === existingId.toLowerCase()
    return patientName && String(existing.patient || '').trim().toLowerCase() === patientName.toLowerCase()
  }
  const matchingRecords = records.filter(isSamePatient)
  if (!matchingRecords.length) return [...records, { ...record, patient: patientName, patientId }]
  const existing = matchingRecords.reduce((merged, current) => ({
    ...merged,
    ...current,
    contact: current.contact || merged.contact || '',
    lastVisit: current.lastVisit > (merged.lastVisit || '') ? current.lastVisit : merged.lastVisit,
  }))
  const updatedRecord = {
    ...existing,
    ...record,
    patient: patientName || existing.patient,
    patientId: patientId || existing.patientId,
    contact: record.contact || existing.contact || '',
    lastVisit: record.lastVisit > (existing.lastVisit || '') ? record.lastVisit : existing.lastVisit,
  }
  return [...records.filter((existingRecord) => !isSamePatient(existingRecord)), updatedRecord]
}
const getMedicalRecordFromAppointment = (appointment, patientRows) => {
  const patientId = String(appointment.patientId || '').trim()
  const patientName = String(appointment.patient || '').trim()
  const patientRow = patientRows.find(([, id]) => patientId && String(id).trim().toLowerCase() === patientId.toLowerCase())
    || patientRows.find(([name]) => patientName && String(name).trim().toLowerCase() === patientName.toLowerCase())
  const record = {
    patient: patientRow?.[0] || (patientName === 'New patient' ? '' : patientName),
    patientId: patientRow?.[1] || patientId,
    contact: patientRow?.[3] || appointment.contact || '',
    lastVisit: getAppointmentDate(appointment),
  }
  return record.patient || record.patientId ? record : null
}

const groupAppointmentsByDoctor = (appointments = [], getDoctorId) => {
  const groupedAppointments = new Map()

  appointments.forEach((appointment) => {
    const doctorName = appointment.doctor || 'Unassigned doctor'
    const group = groupedAppointments.get(doctorName) || []
    group.push({ ...appointment, doctorId: appointment.doctorId || getDoctorId(doctorName) })
    groupedAppointments.set(doctorName, group)
  })

  return Array.from(groupedAppointments.entries())
    .map(([doctor, records]) => ({
      doctor,
      doctorId: records[0]?.doctorId || getDoctorId(doctor),
      visits: [...records].sort((first, second) => getAppointmentDate(second).localeCompare(getAppointmentDate(first))),
    }))
    .sort((first, second) => second.visits.length - first.visits.length || first.doctor.localeCompare(second.doctor))
}

function ProfilePage() {
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState(() => readStored('hms-profile', {
    fullName: 'Alex Doe',
    email: 'alex.doe@medicalcare.com',
    address: '24 Park Avenue, New Delhi',
    contactNo: '+91 98765 43210',
  }))

  const updateProfile = (field, value) => setProfile((current) => ({ ...current, [field]: value }))

  return (
    <section className="account-page">
      <div className="account-page-heading"><div><p className="eyebrow">Account</p><h1>My profile</h1><p className="heading-copy">Manage your personal information and staff details.</p></div><div className="profile-large-avatar avatar">{getInitials(profile.fullName)}</div></div>
      <form className="account-form panel" onSubmit={(event) => { event.preventDefault(); saveStored('hms-profile', profile); window.dispatchEvent(new Event('hms-profile-updated')); setSaved(true) }}>
        <div className="form-section-heading"><div><h2>Personal information</h2><p>These details identify you in the hospital workspace.</p></div></div>
        <div className="profile-fields">
          <label>Full Name<input value={profile.fullName} onChange={(event) => updateProfile('fullName', event.target.value)} /></label>
          <label>Email<input type="email" value={profile.email} onChange={(event) => updateProfile('email', event.target.value)} /></label>
          <label>Address<input value={profile.address} onChange={(event) => updateProfile('address', event.target.value)} /></label>
          <label>Contact No<input type="tel" value={profile.contactNo} onChange={(event) => updateProfile('contactNo', event.target.value)} /></label>
          <label>Work Location<input className="read-only-field" value="Main Hospital · New Delhi" readOnly /><small>Only an administrator can change this.</small></label>
          <label>Position<input className="read-only-field" value="Administrator" readOnly /><small>Only an administrator can change this.</small></label>
        </div>
        <div className="form-actions"><span className="form-status">{saved ? 'Profile updated successfully.' : ''}</span><button className="primary-button" type="submit"><Save size={16} /> Save changes</button></div>
      </form>
    </section>
  )
}

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    setSaving(true)
    try {
      await updatePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password updated successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="account-page narrow-account-page">
      <div className="account-page-heading"><div><p className="eyebrow">Security</p><h1>Change password</h1><p className="heading-copy">Create a new password for your staff account.</p></div><div className="security-icon"><KeyRound size={24} /></div></div>
      <form className="account-form panel password-form" onSubmit={handleSubmit}>
        <div className="form-section-heading"><div><h2>Password details</h2><p>Use at least 12 characters.</p></div></div>
        <label>Current password<input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Enter current password" /></label>
        <label>New password<input type="password" required minLength="12" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Enter new password" /></label>
        <label>Confirm new password<input type="password" required minLength="12" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" /></label>
        {error && <p className="reset-message" role="alert">{error}</p>}
        <div className="form-actions"><span className="form-status" role="status">{message}</span><button className="primary-button" type="submit" disabled={saving}><Save size={16} /> {saving ? 'Updating...' : 'Update password'}</button></div>
      </form>
    </section>
  )
}

function AttendancePage() {
  const [attendance, setAttendance] = useState(() => readStored('hms-attendance', [
    ['September 20, 2026', '--', '--', 'Not marked'],
    ['September 19, 2026', '08:56 AM', '05:41 PM', 'Present'],
    ['September 18, 2026', '09:14 AM', '05:30 PM', 'Late arrival'],
    ['September 17, 2026', '09:00 AM', '05:28 PM', 'Present'],
  ]))
  const todayMarked = attendance[0][3] === 'Present'

  const markTodayAttendance = () => {
    if (todayMarked) return
    const checkIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setAttendance((records) => {
      const updatedRecords = records.map((record, index) => index === 0 ? [record[0], checkIn, '--', 'Present'] : record)
      saveStored('hms-attendance', updatedRecords)
      return updatedRecords
    })
  }

  const downloadReport = () => {
    const report = new jsPDF()
    report.setFillColor(23, 32, 43)
    report.rect(0, 0, 210, 34, 'F')
    report.setTextColor(255, 255, 255)
    report.setFontSize(20)
    report.text('Medical Health Care', 18, 16)
    report.setFontSize(10)
    report.text('Hospital Management System', 18, 24)
    report.setTextColor(23, 32, 43)
    report.setFontSize(18)
    report.text('Monthly Attendance Report', 18, 52)
    report.setFontSize(11)
    report.setTextColor(94, 105, 114)
    report.text('Employee: Alex Doe', 18, 62)
    report.text('Report period: September 2026', 18, 69)
    report.setFillColor(234, 243, 249)
    report.roundedRect(18, 80, 52, 25, 3, 3, 'F')
    report.roundedRect(78, 80, 52, 25, 3, 3, 'F')
    report.roundedRect(138, 80, 52, 25, 3, 3, 'F')
    report.setTextColor(50, 123, 182)
    report.setFontSize(9)
    report.text('PRESENT THIS MONTH', 22, 89)
    report.text('HOURS WORKED', 82, 89)
    report.text('LEAVE BALANCE', 142, 89)
    report.setTextColor(23, 32, 43)
    report.setFontSize(15)
    report.text(`${todayMarked ? '18' : '17'} days`, 22, 99)
    report.text(`${todayMarked ? '144.5' : '136.5'} hrs`, 82, 99)
    report.text('12 days', 142, 99)
    report.setFontSize(12)
    report.text('Attendance history', 18, 124)
    report.setFillColor(50, 123, 182)
    report.rect(18, 131, 174, 10, 'F')
    report.setTextColor(255, 255, 255)
    report.setFontSize(9)
    report.text('Date', 22, 138)
    report.text('Check in', 82, 138)
    report.text('Check out', 122, 138)
    report.text('Status', 164, 138)
    attendance.forEach(([date, checkIn, checkOut, status], index) => {
      const y = 151 + index * 12
      if (index % 2 === 0) {
        report.setFillColor(246, 249, 250)
        report.rect(18, y - 8, 174, 12, 'F')
      }
      report.setTextColor(74, 88, 98)
      report.text(date, 22, y)
      report.text(checkIn, 82, y)
      report.text(checkOut, 122, y)
      report.setTextColor(status === 'Present' ? 49 : 173, status === 'Present' ? 132 : 117, status === 'Present' ? 97 : 31)
      report.text(status, 164, y)
    })
    report.setTextColor(145, 157, 166)
    report.setFontSize(9)
    report.text('Generated from Medical Health Care HMS', 18, 205)
    report.save('alex-doe-attendance-september-2026.pdf')
  }

  return (
    <section className="account-page">
      <div className="account-page-heading"><div><p className="eyebrow">Staff records</p><h1>Attendance</h1><p className="heading-copy">Review your attendance and working hours.</p></div><div className="security-icon attendance-icon"><ClipboardCheck size={24} /></div></div>
      <div className="attendance-stats"><div className="panel attendance-stat"><span>Present this month</span><strong>{todayMarked ? '18' : '17'} days</strong><small>{todayMarked ? '90%' : '85%'} attendance</small></div><div className="panel attendance-stat"><span>Hours worked</span><strong>{todayMarked ? '144.5' : '136.5'} hrs</strong><small>Average 8.0 hrs/day</small></div><div className="panel attendance-stat"><span>Leave balance</span><strong>12 days</strong><small>Available this year</small></div></div>
      <div className="panel attendance-table-wrap"><div className="panel-heading"><div><p className="eyebrow">September 2026</p><h2>Attendance history</h2></div><div className="attendance-actions"><button className={todayMarked ? 'mark-attendance-button marked' : 'mark-attendance-button'} onClick={markTodayAttendance} disabled={todayMarked}><ClipboardCheck size={15} /> {todayMarked ? 'Attendance marked' : 'Mark today attendance'}</button><button className="download-button" onClick={downloadReport}><Download size={15} /> Download PDF</button><button className="select-button">This month <ChevronDown size={14} /></button></div></div><div className="attendance-table"><div className="attendance-table-row attendance-table-header"><span>Date</span><span>Check in</span><span>Check out</span><span>Status</span></div>{attendance.map(([date, checkIn, checkOut, status]) => <div className="attendance-table-row" key={date}><span>{date}</span><span>{checkIn}</span><span>{checkOut}</span><span className={status === 'Present' ? 'status-present' : status === 'Not marked' ? 'status-unmarked' : 'status-late'}>{status}</span></div>)}</div></div>
    </section>
  )
}

const modulePages = {
  Patients: { eyebrow: 'Patient care', title: 'Patients', copy: 'Register, search, and manage patient records.', action: 'Register Patient', stats: [['Total patients', '2,486'], ['New this month', '184'], ['New adding Today', '0']], columns: ['Patient', 'Patient ID', 'Appointed Doctor', 'Contact'], rows: [['Amelia Rodriguez', 'PT-20481', 'Dr. Vinitha Jayamanna', '+94 77 123 4567'], ['Michael Chen', 'PT-20480', 'Dr. Jayamini S Fernando', '+94 71 987 6543'], ['Sophia Williams', 'PT-20479', 'Dr. Sumeda Basnayake', '+94 76 345 2211'], ['Noah Williams', 'PT-20478', 'Dr. Susantha Jayasuriya', '+94 75 664 3322']] },
  Appointments: { eyebrow: 'Daily schedule', title: 'Appointments', copy: 'Coordinate consultations, follow-ups, and doctor schedules.', action: 'Book appointment', stats: [['Today', '38'], ['Upcoming', '126'], ['Completed', '24']], columns: ['Time', 'Patient', 'Doctor', 'Status'], rows: [['09:00 AM', 'Amelia Rodriguez', 'Dr. James Carter', 'Confirmed'], ['10:30 AM', 'Michael Chen', 'Dr. Sofia Patel', 'Confirmed'], ['12:00 PM', 'Sophia Williams', 'Dr. James Carter', 'Waiting'], ['02:30 PM', 'Noah Williams', 'Dr. Aisha Rahman', 'Confirmed']] },
  'Medical records': { eyebrow: 'Clinical documentation', title: 'Medical records', copy: 'Patient records are added automatically when an appointment is booked.', columns: ['Patient', 'Patient ID', 'Last visit day', 'Contact'], rows: [] },
  Laboratory: { eyebrow: 'Diagnostics', title: 'Laboratory', copy: 'Track test requests, samples, results, and reports.', action: 'New test request', stats: [['New Requests', '1'], ['In processing', '1'], ['Collected Test Report', '1']], columns: ['Request', 'Patient', 'Test', 'Status'], rows: [['LAB-1094', 'Amelia Rodriguez', 'Complete blood count', 'Requested'], ['LAB-1093', 'Michael Chen', 'Lipid profile', 'Processing'], ['LAB-1092', 'Sophia Williams', 'Thyroid panel', 'Ready'], ['LAB-1091', 'Noah Williams', 'Blood glucose', 'Collected']] },
  Pharmacy: { eyebrow: 'Medicine inventory', title: 'Pharmacy', copy: 'Manage medicines, prescriptions, stock, and expiry alerts.', action: 'Add medicine', stats: [['Items in stock', '1,248'], ['Low stock items', '12'], ['Expiring soon', '08']], columns: ['Medicine', 'Category', 'In stock', 'Status'], rows: [['Amoxicillin 500mg', 'Antibiotic', '24 units', 'Low stock'], ['Paracetamol 500mg', 'Pain relief', '460 units', 'In stock'], ['Atorvastatin 20mg', 'Cardiology', '182 units', 'In stock'], ['Insulin Glargine', 'Diabetes', '08 units', 'Expiring soon']] },
  Billing: { eyebrow: 'Financial operations', title: 'Billing', copy: 'Generate invoices, record payments, and monitor outstanding balances.', action: 'Create invoice', stats: [['This month', 'Rs. 84,290'], ['Collected', 'Rs. 72,640'], ['Outstanding', 'Rs. 11,650']], columns: ['Invoice', 'Patient', 'Amount', 'Status'], rows: [['INV-2084', 'Amelia Rodriguez', 'Rs. 320.00', 'Paid'], ['INV-2083', 'Michael Chen', 'Rs. 1,250.00', 'Pending'], ['INV-2082', 'Sophia Williams', 'Rs. 840.00', 'Paid'], ['INV-2081', 'Noah Williams', 'Rs. 460.00', 'Overdue']] },
  Staff: { eyebrow: 'People operations', title: 'Staff', copy: 'Manage employees, departments, attendance, and leave records.', action: 'Add staff member', stats: [['Total staff', '148'], ['On duty today', '96'], ['On leave', '12']], columns: ['Staff member', 'Department', 'Position', 'Status'], rows: [['Alex Doe', 'Administration', 'Administrator', 'On duty'], ['Dr. James Carter', 'Cardiology', 'Doctor', 'On duty'], ['Sofia Patel', 'Cardiology', 'Doctor', 'On duty'], ['Aisha Rahman', 'Laboratory', 'Lab specialist', 'On leave']] },
  Reports: { eyebrow: 'Insights', title: 'Reports', copy: 'Review performance, revenue, patient, pharmacy, and laboratory reports.', action: 'Generate report', stats: [['Reports this month', '42'], ['Scheduled reports', '08'], ['Shared reports', '16']], columns: ['Report', 'Category', 'Generated', 'Format'], rows: [['Monthly revenue summary', 'Revenue', 'Sep 20, 2026', 'PDF'], ['Patient admissions', 'Patients', 'Sep 19, 2026', 'PDF'], ['Pharmacy stock report', 'Pharmacy', 'Sep 18, 2026', 'Excel'], ['Lab performance', 'Laboratory', 'Sep 17, 2026', 'PDF']] },
  Settings: { eyebrow: 'System configuration', title: 'Settings', copy: 'Configure hospital preferences, roles, notifications, and security.', action: 'Save settings', stats: [['Active users', '42'], ['Roles configured', '07'], ['Last backup', 'Today']], columns: ['Setting', 'Description', 'Current value', 'Action'], rows: [['Hospital profile', 'Name, address, contact details', 'Configured', 'Edit'], ['User roles', 'Access and permissions', '7 roles', 'Manage'], ['Notifications', 'Email and SMS alerts', 'Enabled', 'Configure'], ['Backup schedule', 'Automatic database backup', 'Daily', 'Manage']] },
}

function MedicineReceiptsModal({ patient, receipts, prescriptions, onClose }) {
  const getPrescriptionItems = (prescription) => prescription.items || [{
    medicineId: prescription.medicineId,
    medicineName: prescription.medicineName,
    quantity: prescription.quantity,
  }]

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal medicine-receipts-modal" role="dialog" aria-modal="true" aria-labelledby="medicine-receipts-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><p className="eyebrow">Pharmacy history</p><h2 id="medicine-receipts-title">Medicine receipts</h2><p className="modal-subtitle">{patient.name} · {patient.id}</p></div>
          <button type="button" className="icon-button" aria-label="Close medicine receipts" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="medicine-receipts-list">
          {prescriptions.map((prescription) => (
            <article className="medicine-receipt-card" key={prescription.id}>
              <div className="medicine-receipt-heading"><div><span>Prescription</span><strong>{prescription.id}</strong></div><span className={`pharmacy-status pharmacy-status-${prescription.status.toLowerCase()}`}>{prescription.status}</span></div>
              <div className="medicine-receipt-table">
                <div className="medicine-receipt-row medicine-receipt-header"><span>Medicine</span><span>Quantity</span></div>
                {getPrescriptionItems(prescription).map((item, index) => (
                  <div className="medicine-receipt-row" key={`${prescription.id}-${item.medicineId}-${index}`}><strong>{item.medicineName}</strong><span>{item.quantity} units</span></div>
                ))}
              </div>
              <div className="medicine-receipt-doctor"><Stethoscope size={15} /><span>Prescribed by</span><strong>{prescription.prescribedBy}</strong></div>
              {prescription.appointmentNumber && <div className="medicine-receipt-doctor"><CalendarDays size={15} /><span>Appointment</span><strong>{prescription.appointmentNumber} · {prescription.appointmentDate}</strong></div>}
              <div className="medicine-receipt-doctor"><Clock3 size={15} /><span>Created</span><strong>{new Date(prescription.createdAt).toLocaleDateString()}</strong></div>
            </article>
          ))}
          {receipts.length ? receipts.map((receipt) => (
            <article className="medicine-receipt-card" key={receipt.id}>
              <div className="receipt-letterhead">
                <div className="receipt-brand-mark"><Stethoscope size={24} /></div>
                <div><strong>Medical</strong><span>HEALTH CARE</span></div>
                <div className="receipt-hospital-details">Pharmacy Services<br />Medical Health Care HMS</div>
              </div>
              <div className="receipt-rule" />
              <div className="medicine-receipt-heading"><div><span>Prescription receipt</span><strong>{receipt.receiptNumber}</strong></div><span>{formatAppointmentDate(receipt.date)}</span></div>
              <div className="medicine-receipt-table">
                <div className="medicine-receipt-row medicine-receipt-header"><span>Medicine</span><span>Dosage / instructions</span></div>
                {receipt.items.map((item, index) => (
                  <div className="medicine-receipt-row" key={`${receipt.id}-${index}`}>
                    <strong>{item.name}</strong><span>{item.dosage}</span>
                  </div>
                ))}
              </div>
              <div className="medicine-receipt-doctor"><Stethoscope size={15} /><span>Prescribed by</span><strong>{receipt.doctor}</strong></div>
            </article>
          )) : !prescriptions.length && <p className="empty-history">No prescriptions or medicine receipts are recorded for this patient.</p>}
        </div>
      </div>
    </div>
  )
}

function PharmacyPage({ patientRows, appointments }) {
  const [inventory, setInventory] = useState(() => {
    const storedInventory = readStored('hms-pharmacy-inventory', null)
    if (Array.isArray(storedInventory)) return storedInventory
    return [
      { id: 'MED-001', name: 'Amoxicillin', strengthMg: 500, quantity: 24, minimumStock: 30, expiryDate: '2026-11-15' },
      { id: 'MED-002', name: 'Paracetamol', strengthMg: 500, quantity: 460, minimumStock: 50, expiryDate: '2027-10-01' },
      { id: 'MED-003', name: 'Atorvastatin', strengthMg: 20, quantity: 182, minimumStock: 25, expiryDate: '2027-03-30' },
      { id: 'MED-004', name: 'Insulin Glargine', strengthMg: 0, quantity: 8, minimumStock: 10, expiryDate: '2026-11-05' },
    ]
  })
  const [prescriptions, setPrescriptions] = useState(() => {
    const storedPrescriptions = readStored('hms-pharmacy-prescriptions', [])
    return Array.isArray(storedPrescriptions) ? storedPrescriptions : []
  })
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
  const [prescriptionItems, setPrescriptionItems] = useState([{ medicineId: '', quantity: '1' }])
  const [restockItem, setRestockItem] = useState(null)
  const [notice, setNotice] = useState('')

  const saveInventory = (updatedInventory) => {
    saveStored('hms-pharmacy-inventory', updatedInventory)
    setInventory(updatedInventory)
  }
  const savePrescriptions = (updatedPrescriptions) => {
    saveStored('hms-pharmacy-prescriptions', updatedPrescriptions)
    setPrescriptions(updatedPrescriptions)
  }
  const getExpiryStatus = (item) => {
    const daysToExpiry = Math.ceil((new Date(`${item.expiryDate}T00:00:00`) - new Date(new Date().toDateString())) / 86400000)
    if (daysToExpiry < 0) return 'Expired'
    if (daysToExpiry <= 30) return 'Expiring soon'
    return 'Valid'
  }
  const getInventoryStatus = (item) => {
    if (item.quantity <= 0) return 'Out of stock'
    if (item.quantity <= item.minimumStock) return 'Low stock'
    return 'In stock'
  }
  const getMedicineName = (item) => item.name.replace(/\s+\d+(?:\.\d+)?\s*mg\b/i, '').trim()
  const getMedicineStrength = (item) => item.strengthMg || Number(item.name.match(/(\d+(?:\.\d+)?)\s*mg\b/i)?.[1]) || 0
  const getMedicineDisplayName = (item) => `${getMedicineName(item)}${getMedicineStrength(item) ? ` ${getMedicineStrength(item)}mg` : ''}`
  const expiryAlertCount = inventory.filter((item) => ['Expired', 'Expiring soon'].includes(getExpiryStatus(item))).length
  const lowStockCount = inventory.filter((item) => getInventoryStatus(item) === 'Low stock').length
  const handleCreateMedicine = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const item = {
      id: `MED-${Date.now()}`,
      name: String(form.get('name')).trim(),
      strengthMg: Number(form.get('strengthMg')),
      quantity: Number(form.get('quantity')),
      minimumStock: 10,
      expiryDate: String(form.get('expiryDate')),
    }
    saveInventory([item, ...inventory])
    setShowInventoryForm(false)
    setNotice('Medicine added to inventory.')
  }
  const handleRestock = (event) => {
    event.preventDefault()
    if (!restockItem) return
    const amount = Number(new FormData(event.currentTarget).get('quantity'))
    if (!Number.isInteger(amount) || amount < 1) {
      setNotice('Enter a restock amount of at least one.')
      return
    }
    saveInventory(inventory.map((item) => item.id === restockItem.id ? { ...item, quantity: item.quantity + amount } : item))
    setRestockItem(null)
    setNotice('Stock updated.')
  }
  const handleCreatePrescription = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const patientId = String(form.get('patientId'))
    const patient = patientRows.find(([, id]) => id === patientId)
    const prescribedBy = String(form.get('prescribedBy')).trim()
    const matchingAppointment = appointments
      .filter((appointment) => appointment.patientId === patientId
        && appointment.status !== 'Cancelled'
        && String(appointment.doctor || '').trim().toLowerCase() === prescribedBy.toLowerCase())
      .sort((first, second) => getAppointmentDate(second).localeCompare(getAppointmentDate(first)))[0]
    const items = prescriptionItems.map((entry) => {
      const medicine = inventory.find(({ id }) => id === entry.medicineId)
      return {
        medicineId: entry.medicineId,
        medicineName: medicine ? getMedicineDisplayName(medicine) : '',
        quantity: Number(entry.quantity),
      }
    })
    if (!patient || !items.length || items.some((item) => !item.medicineId || !item.medicineName || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      setNotice('Select a patient and add at least one valid medicine and quantity.')
      return
    }
    const consolidatedItems = items.reduce((result, item) => {
      const existing = result.find((entry) => entry.medicineId === item.medicineId)
      if (existing) existing.quantity += item.quantity
      else result.push({ ...item })
      return result
    }, [])
    for (const item of consolidatedItems) {
      const medicine = inventory.find(({ id }) => id === item.medicineId)
      if (!medicine) {
        setNotice('A selected medicine is no longer in inventory.')
        return
      }
      if (getExpiryStatus(medicine) === 'Expired') {
        setNotice(`Cannot prescribe expired medicine: ${medicine.name}.`)
        return
      }
      if (medicine.quantity < item.quantity) {
        setNotice(`Insufficient stock for ${getMedicineDisplayName(medicine)}.`)
        return
      }
    }
    const prescription = {
      id: `RX-${Date.now()}`,
      patientId,
      patientName: patient[0],
      items: consolidatedItems,
      prescribedBy,
      appointmentId: matchingAppointment?.id || '',
      appointmentNumber: matchingAppointment?.number || '',
      appointmentDate: matchingAppointment ? formatAppointmentDate(getAppointmentDate(matchingAppointment)) : '',
      status: 'Pending',
      stockDeducted: true,
      createdAt: new Date().toISOString(),
    }
    const reservedQuantities = new Map(consolidatedItems.map((item) => [item.medicineId, item.quantity]))
    saveInventory(inventory.map((item) => {
      const quantity = reservedQuantities.get(item.id)
      return quantity ? { ...item, quantity: item.quantity - quantity } : item
    }))
    savePrescriptions([prescription, ...prescriptions])
    setShowPrescriptionForm(false)
    setPrescriptionItems([{ medicineId: '', quantity: '1' }])
    setNotice('Prescription added for processing.')
  }
  const handleProcessPrescription = (prescription) => {
    if (prescription.stockDeducted) {
      savePrescriptions(prescriptions.map((entry) => entry.id === prescription.id ? { ...entry, status: 'Dispensed', dispensedAt: new Date().toISOString() } : entry))
      setNotice(`Prescription dispensed for ${prescription.patientName}.`)
      return
    }
    const prescriptionItemsToProcess = prescription.items || [{
      medicineId: prescription.medicineId,
      medicineName: prescription.medicineName,
      quantity: prescription.quantity,
    }]
    const requiredByMedicine = prescriptionItemsToProcess.reduce((totals, item) => {
      totals.set(item.medicineId, (totals.get(item.medicineId) || 0) + item.quantity)
      return totals
    }, new Map())
    for (const [medicineId, quantity] of requiredByMedicine) {
      const item = inventory.find(({ id }) => id === medicineId)
      if (!item) {
        setNotice(`Cannot process ${prescription.id}: a medicine is no longer in inventory.`)
        return
      }
      if (getExpiryStatus(item) === 'Expired') {
        setNotice(`Cannot dispense expired medicine: ${item.name}.`)
        return
      }
      if (item.quantity < quantity) {
        setNotice(`Insufficient stock for ${item.name}. Restock before dispensing.`)
        return
      }
    }
    saveInventory(inventory.map((entry) => {
      const quantity = requiredByMedicine.get(entry.id)
      return quantity ? { ...entry, quantity: entry.quantity - quantity } : entry
    }))
    savePrescriptions(prescriptions.map((entry) => entry.id === prescription.id ? { ...entry, status: 'Dispensed', stockDeducted: true, dispensedAt: new Date().toISOString() } : entry))
    setNotice(`Prescription dispensed for ${prescription.patientName}.`)
  }

  return (
    <section className="module-page pharmacy-page">
      <div className="page-heading">
        <div><p className="eyebrow">Medicine inventory</p><h1>Pharmacy</h1><p className="heading-copy">Manage medicines, prescriptions, stock, and expiry alerts.</p></div>
        <div className="pharmacy-page-actions">
          <button className="outline-button" type="button" onClick={() => setShowPrescriptionForm(true)}><Pill size={16} /> New prescription</button>
          <button className="primary-button" type="button" onClick={() => setShowInventoryForm(true)}><Plus size={17} /> Add medicine</button>
        </div>
      </div>
      {notice && <p className="pharmacy-notice" role="status">{notice}</p>}
      <div className="module-stats">
        <div className="panel module-stat"><span>Medicine items</span><strong>{inventory.length}</strong><Pill size={16} /></div>
        <div className="panel module-stat"><span>Low stock items</span><strong>{lowStockCount}</strong><ArrowUpRight size={15} /></div>
        <div className="panel module-stat"><span>Expiry alerts</span><strong>{expiryAlertCount}</strong><AlertTriangle size={16} /></div>
      </div>
      <div className="panel module-table-panel pharmacy-panel">
        <div className="panel-heading"><div><p className="eyebrow">Inventory control</p><h2>Medicine stock and expiry</h2></div></div>
        <div className="module-table pharmacy-table">
          <div className="module-table-row module-table-header pharmacy-inventory-row"><span>Medicine name</span><span>Strength</span><span>Stock</span><span>Expiry date</span><span>Status</span></div>
          {inventory.map((item) => (
            <div className="module-table-row pharmacy-table-row pharmacy-inventory-row" key={item.id}>
              <span>{getMedicineName(item)}</span><span>{getMedicineStrength(item) ? `${getMedicineStrength(item)} mg` : '--'}</span><span>{item.quantity} units</span><span>{item.expiryDate}</span>
              <span className="pharmacy-inventory-status-cell">
                <span className={`pharmacy-status pharmacy-status-${getInventoryStatus(item).toLowerCase().replaceAll(' ', '-')}`}>{getInventoryStatus(item)}</span>
                {['Low stock', 'Out of stock'].includes(getInventoryStatus(item)) && <button className="outline-button pharmacy-restock-button" type="button" onClick={() => setRestockItem(item)}>Restock</button>}
              </span>
            </div>
          ))}
          {!inventory.length && <div className="pharmacy-empty-state">No medicines in inventory. Add a medicine to get started.</div>}
        </div>
      </div>
      <div className="panel module-table-panel pharmacy-panel">
        <div className="panel-heading"><div><p className="eyebrow">Prescription processing</p><h2>Prescriptions</h2></div></div>
        <div className="module-table pharmacy-table">
          <div className="module-table-row module-table-header"><span>Prescription</span><span>Patient</span><span>Medicines</span><span>Quantities</span><span>Prescribed by</span><span>Status / action</span></div>
          {prescriptions.map((prescription) => (
            <div className="module-table-row pharmacy-table-row" key={prescription.id}>
              <span>{prescription.id}</span><span>{prescription.patientName}</span><span>{(prescription.items || [{ medicineName: prescription.medicineName }]).map((item) => item.medicineName).join(', ')}</span><span>{(prescription.items || [{ quantity: prescription.quantity }]).map((item) => `${item.quantity} units`).join(', ')}</span><span>{prescription.prescribedBy}</span>
              <span className="pharmacy-prescription-action"><span className={`pharmacy-status pharmacy-status-${prescription.status.toLowerCase()}`}>{prescription.status}</span>{prescription.status === 'Pending' && <button className="primary-button pharmacy-dispense-button" type="button" onClick={() => handleProcessPrescription(prescription)}>Dispense</button>}</span>
            </div>
          ))}
          {!prescriptions.length && <div className="pharmacy-empty-state">No prescriptions yet. Create one to begin processing.</div>}
        </div>
      </div>
      {showInventoryForm && <div className="modal-backdrop" role="presentation" onClick={() => setShowInventoryForm(false)}><form className="modal pharmacy-form" role="dialog" aria-modal="true" aria-labelledby="pharmacy-inventory-title" onClick={(event) => event.stopPropagation()} onSubmit={handleCreateMedicine}>
        <div className="modal-heading"><div><p className="eyebrow">Inventory management</p><h2 id="pharmacy-inventory-title">Add medicine</h2></div><button type="button" className="icon-button" aria-label="Close add medicine form" onClick={() => setShowInventoryForm(false)}><X size={18} /></button></div>
        <label>Medicine name<input name="name" required /></label><label>Strength (mg)<input name="strengthMg" type="number" min="0.01" step="any" required /></label>
        <div className="form-row"><label>Starting quantity<input name="quantity" type="number" min="0" step="1" required /></label><label>Expiry date<input name="expiryDate" type="date" required /></label></div>
        <button className="primary-button full-width" type="submit">Save medicine</button>
      </form></div>}
      {showPrescriptionForm && <div className="modal-backdrop" role="presentation" onClick={() => setShowPrescriptionForm(false)}><form className="modal pharmacy-form" role="dialog" aria-modal="true" aria-labelledby="pharmacy-prescription-title" onClick={(event) => event.stopPropagation()} onSubmit={handleCreatePrescription}>
        <div className="modal-heading"><div><p className="eyebrow">Prescription processing</p><h2 id="pharmacy-prescription-title">New prescription</h2></div><button type="button" className="icon-button" aria-label="Close prescription form" onClick={() => setShowPrescriptionForm(false)}><X size={18} /></button></div>
        <label>Patient<select name="patientId" required defaultValue=""><option value="" disabled>Select patient</option>{patientRows.map(([name, id]) => <option key={id} value={id}>{name} · {id}</option>)}</select></label>
        <div className="pharmacy-prescription-items">
          {prescriptionItems.map((prescriptionItem, index) => (
            <div className="pharmacy-prescription-item" key={`prescription-item-${index}`}>
              <label>Medicine<select required value={prescriptionItem.medicineId} onChange={(event) => setPrescriptionItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, medicineId: event.target.value } : item))}><option value="" disabled>Select medicine</option>{inventory.map((item) => <option key={item.id} value={item.id} disabled={getExpiryStatus(item) === 'Expired'}>{getMedicineDisplayName(item)} ({item.quantity} in stock)</option>)}</select></label>
              <label>Quantity<input type="number" min="1" step="1" required value={prescriptionItem.quantity} onChange={(event) => setPrescriptionItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} /></label>
              {prescriptionItems.length > 1 && <button className="outline-button pharmacy-remove-item" type="button" onClick={() => setPrescriptionItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}
            </div>
          ))}
          <button className="outline-button pharmacy-add-item" type="button" onClick={() => setPrescriptionItems((current) => [...current, { medicineId: '', quantity: '1' }])}><Plus size={14} /> Add another medicine</button>
        </div>
        <label>Prescribed by<input name="prescribedBy" required /></label>
        <button className="primary-button full-width" type="submit">Add to processing queue</button>
      </form></div>}
      {restockItem && <div className="modal-backdrop" role="presentation" onClick={() => setRestockItem(null)}><form className="modal pharmacy-form" role="dialog" aria-modal="true" aria-labelledby="pharmacy-restock-title" onClick={(event) => event.stopPropagation()} onSubmit={handleRestock}>
        <div className="modal-heading"><div><p className="eyebrow">Stock management</p><h2 id="pharmacy-restock-title">Restock {restockItem.name}</h2><p className="modal-subtitle">Current stock: {restockItem.quantity} units</p></div><button type="button" className="icon-button" aria-label="Close restock form" onClick={() => setRestockItem(null)}><X size={18} /></button></div>
        <label>Quantity to add<input name="quantity" type="number" min="1" step="1" required /></label><button className="primary-button full-width" type="submit">Update stock</button>
      </form></div>}
    </section>
  )
}

function ModulePage({ page, onAction, patientRows = [], medicalRecordRows = [], medicineReceipts = [], onDeletePatient = () => {}, onEditPatient = () => {}, onViewHistory = () => {}, onViewMedicalRecordHistory = () => {}, onUploadDocument = () => {}, patientSearch = '' }) {
  const [medicineReceiptPatient, setMedicineReceiptPatient] = useState(null)
  const [pharmacyPrescriptions] = useState(() => {
    const storedPrescriptions = readStored('hms-pharmacy-prescriptions', [])
    return Array.isArray(storedPrescriptions) ? storedPrescriptions : []
  })
  const [selectedLaboratoryReport, setSelectedLaboratoryReport] = useState(null)
  const [showLaboratoryRequestForm, setShowLaboratoryRequestForm] = useState(false)
  const [laboratoryRequestNotice, setLaboratoryRequestNotice] = useState('')
  const [laboratoryRequests, setLaboratoryRequests] = useState(() => {
    const storedRequests = readStored('hms-laboratory-requests', [])
    return Array.isArray(storedRequests) ? storedRequests : []
  })
  const [newLaboratoryRequestCount, setNewLaboratoryRequestCount] = useState(() => {
    const storedCount = readStored('hms-laboratory-new-request-count-v2', 1)
    return Number.isFinite(storedCount) && storedCount >= 1 ? storedCount : 1
  })
  const [laboratoryStatusOverrides, setLaboratoryStatusOverrides] = useState(() => {
    const storedOverrides = readStored('hms-laboratory-status-overrides', {})
    return storedOverrides && typeof storedOverrides === 'object' && !Array.isArray(storedOverrides) ? storedOverrides : {}
  })
  const [collectedTestReportCount, setCollectedTestReportCount] = useState(() => {
    const storedCount = readStored('hms-collected-test-report-count-v2', 1)
    return Number.isFinite(storedCount) && storedCount >= 1 ? storedCount : 1
  })
  const [processingTestCount, setProcessingTestCount] = useState(() => {
    const storedCount = readStored('hms-processing-test-count-v2', 1)
    return Number.isFinite(storedCount) && storedCount >= 1 ? storedCount : 1
  })
  useEffect(() => {
    if (!laboratoryRequestNotice) return undefined
    const timeout = window.setTimeout(() => setLaboratoryRequestNotice(''), 1800)
    return () => window.clearTimeout(timeout)
  }, [laboratoryRequestNotice])
  const config = modulePages[page]
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date())
  const isPatientsPage = page === 'Patients'
  const isMedicalRecordsPage = page === 'Medical records'
  const isLaboratoryPage = page === 'Laboratory'
  const normalizedPatientSearch = patientSearch.trim().toLowerCase()
  const rows = isPatientsPage
    ? patientRows.filter(([patient, patientId]) => !normalizedPatientSearch || [patient, patientId].some((value) => String(value || '').toLowerCase().includes(normalizedPatientSearch)))
    : isMedicalRecordsPage
      ? medicalRecordRows.filter((row) => !normalizedPatientSearch || row.some((value) => String(value || '').toLowerCase().includes(normalizedPatientSearch)))
      : isLaboratoryPage
        ? [
          ...laboratoryRequests.map((request) => ({
            requestNumber: request.requestNumber,
            patientName: request.patientName,
            patientId: request.patientId,
            testName: request.testName,
            status: request.status || 'Requested',
            requestedBy: request.requestedBy,
            report: request.report,
          })),
          ...config.rows.map(([requestNumber, patientName, testName, status]) => {
            const patient = patientRows.find(([name]) => name === patientName)
            const knownReport = {
              'LAB-1094': { result: 'Hemoglobin 13.8 g/dL', referenceRange: '12.0–16.0 g/dL', notes: 'Complete blood count parameters reviewed.' },
              'LAB-1092': { result: 'TSH 2.1 mIU/L', referenceRange: '0.4–4.0 mIU/L', notes: 'Thyroid-stimulating hormone is within the stated reference range.' },
            }[requestNumber]
            return {
              requestNumber,
              patientName,
              patientId: patient?.[1] || '',
              testName,
              status: laboratoryStatusOverrides[requestNumber] || status,
              requestedBy: patient?.[2] || '',
              report: knownReport ? {
                reportNumber: `RPT-${requestNumber.slice(4)}`,
                testedAt: '2026-10-24',
                ...knownReport,
              } : null,
            }
          }),
        ]
        : config.rows
  const columns = isPatientsPage ? ['Patient', 'Patient ID', 'Address', 'Contact'] : config.columns
  const handleCreateLaboratoryRequest = (request) => {
    const newRequest = {
      ...request,
      requestNumber: `LAB-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    const updatedRequests = [newRequest, ...laboratoryRequests]
    saveStored('hms-laboratory-requests', updatedRequests)
    setLaboratoryRequests(updatedRequests)
    const updatedCount = newLaboratoryRequestCount + 1
    saveStored('hms-laboratory-new-request-count-v2', updatedCount)
    setNewLaboratoryRequestCount(updatedCount)
    setShowLaboratoryRequestForm(false)
    setLaboratoryRequestNotice('Successfully created new test.')
  }
  const handleLaboratoryStatusChange = (requestNumber, status) => {
    const currentRequest = laboratoryRequests.find((request) => request.requestNumber === requestNumber)
    const currentStatus = currentRequest?.status || laboratoryStatusOverrides[requestNumber] || config.rows.find(([id]) => id === requestNumber)?.[3]
    if (currentStatus !== 'Processing' && status === 'Processing') {
      const updatedCount = processingTestCount + 1
      saveStored('hms-processing-test-count-v2', updatedCount)
      setProcessingTestCount(updatedCount)
    } else if (currentStatus !== 'Collected' && status === 'Collected') {
      const updatedCount = collectedTestReportCount + 1
      saveStored('hms-collected-test-report-count-v2', updatedCount)
      setCollectedTestReportCount(updatedCount)
    }

    if (currentRequest) {
      const updatedRequests = laboratoryRequests.map((request) => request.requestNumber === requestNumber ? { ...request, status } : request)
      saveStored('hms-laboratory-requests', updatedRequests)
      setLaboratoryRequests(updatedRequests)
      return
    }

    const updatedOverrides = { ...laboratoryStatusOverrides, [requestNumber]: status }
    saveStored('hms-laboratory-status-overrides', updatedOverrides)
    setLaboratoryStatusOverrides(updatedOverrides)
  }

  return (
    <>
    {laboratoryRequestNotice && <div className="patient-added-toast" role="status">{laboratoryRequestNotice}</div>}
    <section className="module-page">
      <div className="page-heading"><div><p className="eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p className="heading-copy">{config.copy}</p></div>{!isMedicalRecordsPage && <button className="primary-button" onClick={() => isLaboratoryPage ? setShowLaboratoryRequestForm(true) : onAction()}><Plus size={17} /> {config.action}</button>}</div>
      {!isMedicalRecordsPage && <div className="module-stats">{config.stats.map(([label, value]) => <div className="panel module-stat" key={label}><span>{label}</span><strong>{isLaboratoryPage && label === 'New Requests' ? newLaboratoryRequestCount : isLaboratoryPage && label === 'Collected Test Report' ? collectedTestReportCount : isLaboratoryPage && label === 'In processing' ? processingTestCount : value}</strong><ArrowUpRight size={15} /></div>)}</div>}
      <div className="panel module-table-panel"><div className="panel-heading"><div><p className="eyebrow">Workspace records</p><h2>Recent {config.title.toLowerCase()}</h2></div><span className="current-month-label">{currentMonth}</span></div><div className={`module-table ${isMedicalRecordsPage ? 'medical-record-table' : ''}`}><div className="module-table-row module-table-header">{columns.map((column) => <span key={column}>{column}</span>)}{isMedicalRecordsPage && <><span>History</span><span className="medicine-dosage-heading"><Pill size={14} /> Medicine Dos</span></>}</div>{rows.map((row) => {
        if (isLaboratoryPage) {
          const report = row.report || {
            reportNumber: `RPT-${String(row.requestNumber).replace(/^LAB-/, '')}`,
            testedAt: row.completedAt || row.requestedAt || getSriLankaDateKey(new Date()),
            result: 'Result not entered',
            referenceRange: 'Not provided',
            notes: '',
          }
          return (
            <div className="module-table-row" key={row.requestNumber}>
              <span>{row.requestNumber}</span>
              <span>{row.patientName}{row.patientId ? ` (${row.patientId})` : ''}</span>
              <span>{row.testName}</span>
              <span className="laboratory-status-cell">
                <select className={`laboratory-status laboratory-status-${String(row.status).toLowerCase()}`} aria-label={`Update status for ${row.requestNumber}`} value={row.status} onChange={(event) => handleLaboratoryStatusChange(row.requestNumber, event.target.value)}>
                  <option>Requested</option>
                  <option>Processing</option>
                  <option>Collected</option>
                  <option>Ready</option>
                </select>
                {row.status === 'Ready' && <>
                  <button className="patient-action-button laboratory-report-view" type="button" title="View test report" aria-label={`View test report for ${row.patientName} - ${row.testName}`} onClick={() => setSelectedLaboratoryReport({
                    ...report,
                    patientName: row.patientName,
                    patientId: row.patientId,
                    requestedBy: row.requestedBy || '',
                    testName: row.testName,
                  })}><Eye size={14} /></button>
                  <button className="patient-action-button laboratory-report-download" type="button" title="Download test report PDF" aria-label={`Download test report PDF for ${row.patientName} - ${row.testName}`} onClick={() => createMedicalReportPdf({
                    ...report,
                    patientName: row.patientName,
                    patientId: row.patientId,
                    requestedBy: row.requestedBy || '',
                    testCategory: row.testName,
                    testName: '',
                    testDate: report.testedAt ? formatAppointmentDate(report.testedAt) : '',
                  })}><Download size={14} /></button>
                </>}
              </span>
            </div>
          )
        }
        if (isPatientsPage) {
          const [patient, patientId, , contact, address] = row
          return (
            <div className="module-table-row" key={patientId}>
              <span>{patient}</span>
              <span>{patientId}</span>
              <span>{address || '--'}</span>
              <span className="patient-contact-cell">
                <span>{contact}</span>
                <span className="patient-row-actions">
                  <button className="patient-action-button" type="button" aria-label={`Update ${patient}`} onClick={() => onEditPatient(row)}><Pencil size={13} /></button>
                  <button className="patient-action-button" type="button" aria-label={`View medical history for ${patient}`} onClick={() => onViewHistory(row)}><History size={13} /></button>
                  <label className="patient-action-button" aria-label={`Upload PDF documents for ${patient}`} title="Upload PDF documents"><Upload size={13} /><input type="file" accept=".pdf,application/pdf" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadDocument(row, file); event.target.value = '' }} /></label>
                  <button className="patient-delete-button" type="button" aria-label={`Delete ${patient}`} onClick={() => onDeletePatient(patientId)}><Trash2 size={13} /></button>
                </span>
              </span>
            </div>
          )
        }

        if (isMedicalRecordsPage) {
          return (
            <div className="module-table-row" key={row[1] || row[0]}>
              {row.map((value, index) => <span key={`${row[1]}-${index}`}>{value || '--'}</span>)}
              <span><button className="patient-action-button" type="button" aria-label={`View medical history for ${row[0]}`} title="View medical history" onClick={() => onViewMedicalRecordHistory(row)}><History size={14} /></button></span>
              <span className="medicine-dosage-cell">
                <button className="medicine-dosage-icon" type="button" aria-label={`View prescriptions and medicine receipts for ${row[0]}`} title={`View prescriptions and medicine receipts for ${row[0]}`} onClick={() => setMedicineReceiptPatient({ name: row[0], id: row[1] })}><Pill size={18} /></button>
              </span>
            </div>
          )
        }

        return (
          <div className="module-table-row" key={row[0]}>
            {row.map((value, index) => <span className={index === row.length - 1 ? (isLaboratoryPage ? `laboratory-status laboratory-status-${String(value).toLowerCase()}` : 'module-status') : ''} key={`${row[0]}-${value}`}>{value}</span>)}
          </div>
        )
      })}{!rows.length && <div className="module-table-row"><span>{isMedicalRecordsPage ? 'No medical records yet. Book an appointment to create a patient record.' : 'No records found.'}</span></div>}</div></div>
    </section>
    {medicineReceiptPatient && (
      <MedicineReceiptsModal
        patient={medicineReceiptPatient}
        receipts={medicineReceipts.filter((receipt) => receipt.patientId === medicineReceiptPatient.id)}
        prescriptions={pharmacyPrescriptions.filter((prescription) => prescription.patientId === medicineReceiptPatient.id)}
        onClose={() => setMedicineReceiptPatient(null)}
      />
    )}
    {selectedLaboratoryReport && <LaboratoryReportModal report={selectedLaboratoryReport} onClose={() => setSelectedLaboratoryReport(null)} />}
    {showLaboratoryRequestForm && (
      <LaboratoryTestRequestForm
        patientRows={patientRows}
        onClose={() => setShowLaboratoryRequestForm(false)}
        onSave={handleCreateLaboratoryRequest}
      />
    )}
    </>
  )
}

function LaboratoryReportModal({ report, onClose }) {
  return (
    <div className="modal-backdrop receipt-backdrop" role="presentation" onClick={onClose}>
      <div className="appointment-receipt medical-report-sheet" role="dialog" aria-modal="true" aria-labelledby="laboratory-report-title" onClick={(event) => event.stopPropagation()}>
        <div className="receipt-letterhead">
          <div className="receipt-brand-mark"><Stethoscope size={24} /></div>
          <div><strong>Medical</strong><span>HEALTH CARE</span></div>
          <div className="receipt-hospital-details">Clinical report<br />Medical Health Care HMS</div>
        </div>
        <div className="receipt-rule" />
        <div className="receipt-title"><p>Laboratory result</p><h2 id="laboratory-report-title">Medical Report</h2></div>
        <div className="receipt-details">
          <div><span>Patient Name:</span><strong>{report.patientName || '--'}</strong></div>
          <div><span>Patient ID:</span><strong>{report.patientId || '--'}</strong></div>
          <div><span>Doctor / Requested by:</span><strong>{report.requestedBy || '--'}</strong></div>
          <div><span>Report No:</span><strong>{report.reportNumber || '--'}</strong></div>
          <div><span>Test Date:</span><strong>{report.testedAt ? formatAppointmentDate(report.testedAt) : '--'}</strong></div>
          <div><span>Test:</span><strong>{report.testName || '--'}</strong></div>
        </div>
        <div className="medical-report-summary">
          <h3>Test result</h3>
          <div className="medical-report-result-grid">
            <div><span>Result</span><strong>{report.result || 'Not entered'}</strong></div>
            <div><span>Reference range</span><strong>{report.referenceRange || 'Not provided'}</strong></div>
          </div>
          {report.notes && <p>{report.notes}</p>}
        </div>
        <div className="receipt-footer"><span>Laboratory report</span><span>Medical Health Care</span></div>
        <div className="receipt-actions"><button type="button" className="outline-button delete-cancel" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}

function LaboratoryTestRequestForm({ patientRows, onClose, onSave }) {
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    contact: '',
    testName: '',
    requestedBy: '',
    requestedAt: getSriLankaDateKey(new Date()),
    priority: 'Routine',
    notes: '',
  })

  const handlePatientChange = (patientId) => {
    const patient = patientRows.find(([, id]) => id === patientId)
    setForm((current) => ({
      ...current,
      patientId,
      patientName: patient?.[0] || '',
      contact: patient?.[3] || '',
    }))
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="modal laboratory-request-modal" role="dialog" aria-modal="true" aria-labelledby="laboratory-request-title" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
        <div className="modal-heading">
          <div><p className="eyebrow">Laboratory</p><h2 id="laboratory-request-title">New test request</h2><p className="modal-subtitle">Enter the patient and requested test details.</p></div>
          <button type="button" className="icon-button" aria-label="Close test request form" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="patient-add-form">
          <label>Patient name<select required value={form.patientId} onChange={(event) => handlePatientChange(event.target.value)}><option value="">Select a patient</option>{patientRows.map(([name, id]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <div className="form-row">
            <label>Patient ID<input value={form.patientId} readOnly placeholder="Selected patient ID" /></label>
            <label>Contact number<input value={form.contact} readOnly placeholder="Patient contact number" /></label>
          </div>
          <div className="form-row">
            <label>Test name<input required value={form.testName} onChange={(event) => setForm({ ...form, testName: event.target.value })} placeholder="e.g. Fasting blood glucose" /></label>
            <label>Requested by<input required value={form.requestedBy} onChange={(event) => setForm({ ...form, requestedBy: event.target.value })} placeholder="Doctor or clinician name" /></label>
          </div>
          <div className="form-row">
            <label>Request date<input required type="date" value={form.requestedAt} onChange={(event) => setForm({ ...form, requestedAt: event.target.value })} /></label>
            <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>Routine</option><option>Urgent</option><option>STAT</option></select></label>
          </div>
          <label>Clinical notes<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional instructions or clinical notes" /></label>
          <div className="patient-form-actions"><button type="button" className="outline-button delete-cancel" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Submit request</button></div>
        </div>
      </form>
    </div>
  )
}

function AppointmentsPage({ appointments, doctors, getScheduledDoctors, patientRows = [], patientSearch = '', onBookAppointment, onCancelAppointment, onDeleteAppointment, onRescheduleAppointment, onStatusChange }) {
  const [form, setForm] = useState(null)
  const [receiptAppointment, setReceiptAppointment] = useState(null)
  const normalizedSearch = patientSearch.trim().toLowerCase()
  const visibleAppointments = appointments
    .filter((appointment) => !normalizedSearch || [appointment.patient, appointment.patientId, appointment.doctor, appointment.number, appointment.status || 'Confirmed'].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))
    .sort((first, second) => {
      const firstCreatedAt = first.createdAt || Number(String(first.id || '').replace('APT-', '')) || 0
      const secondCreatedAt = second.createdAt || Number(String(second.id || '').replace('APT-', '')) || 0
      return secondCreatedAt - firstCreatedAt
    })
  const getDoctorsForDate = (date) => getScheduledDoctors ? getScheduledDoctors(date.slice(8, 10)) : doctors
  const getFormAppointmentNumber = (doctor, date) => {
    const count = appointments.filter((appointment) => appointment.doctor === doctor && appointment.day === date.slice(8, 10) && appointment.status !== 'Cancelled').length
    return count >= 40 ? '' : `AN - ${String(count + 1).padStart(2, '0')}`
  }

  const openForm = (appointment = null) => setForm(appointment
    ? { ...appointment, patient: appointment.patient || '', patientId: appointment.patientId || '', contact: appointment.contact || '', date: appointment.date || `2026-09-${appointment.day}` }
    : { patient: '', patientId: '', doctor: getDoctorsForDate(getSriLankaDateKey(new Date()))[0]?.name || '', date: getSriLankaDateKey(new Date()), time: '09:00', contact: '' })

  const submitForm = (event) => {
    event.preventDefault()
    if (!form.doctor || !form.date || !form.time) return
    const sanitizedForm = {
      ...form,
      patient: form.patient.trim(),
      contact: form.contact.trim(),
    }
    if (form.id) onRescheduleAppointment(sanitizedForm)
    else onBookAppointment(sanitizedForm)
    setForm(null)
  }

  return (
    <section className="module-page">
      <div className="page-heading"><div><p className="eyebrow">Daily schedule</p><h1>Appointments</h1><p className="heading-copy">Book, reschedule, cancel, and track appointment status.</p></div><button className="primary-button" type="button" onClick={() => openForm()}><Plus size={17} /> Book Appointment</button></div>
      <div className="module-stats appointment-stats"><div className="panel module-stat"><span>Today</span><strong>{appointments.filter((appointment) => appointment.day === new Date().getDate().toString().padStart(2, '0') && appointment.status !== 'Cancelled').length}</strong></div><div className="panel module-stat"><span>Upcoming</span><strong>{appointments.filter((appointment) => appointment.status !== 'Cancelled').length}</strong></div><div className="panel module-stat"><span>Cancelled</span><strong>{appointments.filter((appointment) => appointment.status === 'Cancelled').length}</strong></div></div>
      <div className="panel module-table-panel"><div className="panel-heading"><div><p className="eyebrow">Appointment records</p><h2>All appointments</h2></div></div><div className="module-table appointment-table"><div className="module-table-row module-table-header"><span>Appointment No</span><span>Appointed Doctore</span><span>Patient ID</span><span>Patient Name</span></div>{visibleAppointments.map((appointment) => <div className={`module-table-row appointment-record-row ${appointment.status === 'Cancelled' ? 'appointment-row-cancelled' : ''}`} key={appointment.id || `${appointment.doctor}-${appointment.day}-${appointment.time}`}><span>{appointment.number || '--'}</span><span>{appointment.doctor || '--'}</span><span>{appointment.patientId || '--'}</span><span className="appointment-patient-cell"><span>{appointment.patient || '--'}</span><span className="appointment-inline-actions"><button type="button" aria-label={`Print appointment ${appointment.number || ''}`} onClick={() => setReceiptAppointment(appointment)}><Printer size={13} /></button><button type="button" aria-label={`Reschedule appointment ${appointment.number || ''}`} onClick={() => openForm(appointment)}><CalendarClock size={13} /></button><button type="button" aria-label={`Cancel appointment ${appointment.number || ''}`} onClick={() => onCancelAppointment(appointment)}><X size={13} /></button><button type="button" aria-label={`Delete appointment ${appointment.number || ''}`} onClick={() => onDeleteAppointment(appointment)}><Trash2 size={13} /></button></span></span></div>)}</div></div>
      {form && <div className="modal-backdrop" role="presentation" onClick={() => setForm(null)}><form className="modal appointment-modal" onClick={(event) => event.stopPropagation()} onSubmit={submitForm}><div className="modal-heading"><div><p className="eyebrow">Appointment management</p><h2>{form.id ? 'Reschedule appointment' : 'Book appointment'}</h2></div><button type="button" className="icon-button" aria-label="Close appointment form" onClick={() => setForm(null)}><X size={18} /></button></div><div className="form-row"><label>Patient ID<input required value={form.patientId} onChange={(event) => { const patientId = event.target.value; const patient = patientRows.find(([, id]) => String(id).trim().toLowerCase() === patientId.trim().toLowerCase()); setForm({ ...form, patientId, ...(patient ? { patient: patient[0], contact: patient[3] || '' } : {}) }) }} placeholder="PT-00000" /></label><label>Patient Name<input required value={form.patient} onChange={(event) => setForm({ ...form, patient: event.target.value })} placeholder="Patient full name" /></label></div><div className="form-row"><label>Appointment number<input value={form.id ? form.number || '--' : getFormAppointmentNumber(form.doctor, form.date) || 'FULL (40/40)'} readOnly /></label><label>Doctor<select value={form.doctor} onChange={(event) => setForm({ ...form, doctor: event.target.value })}>{getDoctorsForDate(form.date).map((doctor) => <option key={doctor.name}>{doctor.name}</option>)}</select></label></div><div className="form-row"><label>Date<input required type="date" value={form.date} onChange={(event) => { const date = event.target.value; const dateDoctors = getDoctorsForDate(date); setForm({ ...form, date, day: date.slice(8, 10), doctor: dateDoctors[0]?.name || '' }) }} /></label><label>Time<input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label></div><label>Contact number<input required type="tel" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="Patient contact number" /></label><button className="primary-button full-width" type="submit">{form.id ? 'Save new schedule' : 'Book Appointment'}</button></form></div>}
      {receiptAppointment && <div className="modal-backdrop receipt-backdrop" role="presentation" onClick={() => setReceiptAppointment(null)}><div className="appointment-receipt" onClick={(event) => event.stopPropagation()}><div className="receipt-letterhead"><div className="receipt-brand-mark"><Stethoscope size={24} /></div><div><strong>Medical</strong><span>HEALTH CARE</span></div><div className="receipt-hospital-details">Appointment Services<br />Medical Health Care HMS</div></div><div className="receipt-rule" /><div className="receipt-title"><p>Official appointment confirmation</p><h2>Appointment Receipt</h2></div><div className="receipt-details"><div><span>Patient Name:</span><strong>{receiptAppointment.patient || '--'}</strong></div><div><span>Patient ID:</span><strong>{receiptAppointment.patientId || '--'}</strong></div><div><span>Doctor Name:</span><strong>{receiptAppointment.doctor || '--'}</strong></div><div><span>Appointment No:</span><strong>{receiptAppointment.number || '--'}</strong></div><div><span>Appointment Date:</span><strong>{receiptAppointment.date || `2026-09-${receiptAppointment.day || '--'}`}</strong></div><div><span>Appointment Time:</span><strong>{receiptAppointment.time || '--'}</strong></div></div><div className="receipt-footer"><span>Please bring this receipt to your appointment.</span><span>Medical Health Care</span></div><div className="receipt-actions"><button type="button" className="outline-button delete-cancel" onClick={() => setReceiptAppointment(null)}>Close</button><button type="button" className="primary-button" onClick={() => window.print()}><Printer size={15} /> Print Receipt</button></div></div></div>}
    </section>
  )
}

function DoctorsPage({ doctors, onSave }) {
  const [doctorList, setDoctorList] = useState(() => doctors.map((doctor, index) => ({
    ...doctor,
    licenseNumber: doctor.licenseNumber || `ML-${String(index + 1).padStart(4, '0')}`,
    doctorId: doctor.doctorId || `DR-${String(index + 1).padStart(4, '0')}`,
    gender: doctor.gender || 'Not specified',
    nic: doctor.nic || 'Not specified',
  })))
  const [doctorForm, setDoctorForm] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)

  const openDoctorForm = (mode, doctor = null) => {
    setDoctorForm({ mode, originalName: doctor?.name || '', name: doctor?.name || '', licenseNumber: doctor?.licenseNumber || '', doctorId: doctor?.doctorId || '', gender: doctor?.gender || '', nic: doctor?.nic || '', specialty: doctor?.specialty || '', startTime: doctor?.startTime || '09:00 AM', consultationDate: doctor?.consultationDate || getSriLankaDateKey(new Date()) })
  }

  const saveDoctor = (event) => {
    event.preventDefault()
    if (!doctorForm.name.trim() || !doctorForm.specialty.trim()) return
    const updatedDoctor = { name: doctorForm.name.trim(), licenseNumber: doctorForm.licenseNumber.trim(), doctorId: doctorForm.doctorId.trim(), gender: doctorForm.gender, nic: doctorForm.nic.trim(), specialty: doctorForm.specialty.trim(), startTime: doctorForm.startTime, consultationDate: doctorForm.consultationDate, color: doctorList.find((doctor) => doctor.name === doctorForm.originalName)?.color || 'blue' }
    const updatedDoctors = doctorForm.mode === 'add'
      ? [...doctorList, updatedDoctor]
      : doctorList.map((doctor) => doctor.name === doctorForm.originalName ? updatedDoctor : doctor)
    setDoctorList(updatedDoctors)
    onSave(updatedDoctors)
    setDoctorForm(null)
  }

  const formTitle = doctorForm?.mode === 'add'
    ? 'Add doctor'
    : doctorForm?.mode === 'department'
      ? 'Assign department'
      : doctorForm?.mode === 'schedule' ? 'Manage schedule' : 'Update doctor details'

  return (
    <section className="module-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Medical team</p>
          <h1>Doctors</h1>
          <p className="heading-copy">All doctors currently working in the hospital.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => openDoctorForm('add')}><Plus size={17} /> Add Doctor</button>
      </div>

      <div className="panel doctor-table-panel">
        <div className="doctor-table doctor-table-header"><span /><span>Doctor</span><span>Medical License Number</span><span>Doctor ID</span><span>Gender</span><span>NIC</span><span>Department</span></div>
        {doctorList.map((doctor) => (
          <div className="doctor-table doctor-table-row" key={doctor.name}>
            <div className={`appointment-avatar ${doctor.color}`}>{doctor.name.replace('Dr. ', '').split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
            <div className="doctor-table-name">
              <button type="button" className="doctor-name-button" onClick={() => setSelectedDoctor(doctor)}>{doctor.name}</button>
            </div>
            <span className="doctor-table-specialty">{doctor.licenseNumber}</span>
            <span className="doctor-table-specialty">{doctor.doctorId}</span>
            <span className="doctor-table-specialty">{doctor.gender}</span>
            <span className="doctor-table-specialty">{doctor.nic}</span>
            <span className="doctor-table-specialty">{doctor.specialty}</span>
          </div>
        ))}
      </div>
      {selectedDoctor && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedDoctor(null)}><div className="doctor-actions-popover" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Doctor details</p><h2>{selectedDoctor.name}</h2><p className="modal-subtitle">{selectedDoctor.specialty}</p></div><button type="button" className="icon-button" aria-label="Close doctor details" onClick={() => setSelectedDoctor(null)}><X size={18} /></button></div><div className="doctor-detail-actions"><button type="button" onClick={() => { setSelectedDoctor(null); openDoctorForm('edit', selectedDoctor) }}><Pencil size={15} /> Update</button><button type="button" onClick={() => { setSelectedDoctor(null); openDoctorForm('department', selectedDoctor) }}><Building2 size={15} /> Department</button><button type="button" onClick={() => { setSelectedDoctor(null); openDoctorForm('schedule', selectedDoctor) }}><CalendarClock size={15} /> Schedule</button></div></div></div>}
          {doctorForm && <div className="modal-backdrop" role="presentation" onClick={() => setDoctorForm(null)}><form className="modal doctor-modal" onClick={(event) => event.stopPropagation()} onSubmit={saveDoctor}><div className="modal-heading"><div><p className="eyebrow">Doctor management</p><h2>{formTitle}</h2></div><button type="button" className="icon-button" aria-label="Close doctor form" onClick={() => setDoctorForm(null)}><X size={18} /></button></div><div className="patient-add-form">{doctorForm.mode !== 'schedule' && <><label>Doctor name<input required value={doctorForm.name} onChange={(event) => setDoctorForm({ ...doctorForm, name: event.target.value })} placeholder="Dr. Full Name" /></label><div className="form-row"><label>Medical License Number<input required value={doctorForm.licenseNumber} onChange={(event) => setDoctorForm({ ...doctorForm, licenseNumber: event.target.value })} placeholder="ML-0001" /></label><label>Doctor ID<input required value={doctorForm.doctorId} onChange={(event) => setDoctorForm({ ...doctorForm, doctorId: event.target.value })} placeholder="DR-0001" /></label></div><div className="form-row"><label>Gender<select required value={doctorForm.gender} onChange={(event) => setDoctorForm({ ...doctorForm, gender: event.target.value })}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></label><label>NIC<input required value={doctorForm.nic} onChange={(event) => setDoctorForm({ ...doctorForm, nic: event.target.value })} placeholder="NIC number" /></label></div><label>Department<input required value={doctorForm.specialty} onChange={(event) => setDoctorForm({ ...doctorForm, specialty: event.target.value })} placeholder="Department or specialty" /></label></>}{doctorForm.mode === 'schedule' && <div className="form-row"><label>Consultation date<input type="date" required value={doctorForm.consultationDate} onChange={(event) => setDoctorForm({ ...doctorForm, consultationDate: event.target.value })} /></label><label>Consultation time<input type="time" required value={doctorForm.startTime24 || '09:00'} onChange={(event) => setDoctorForm({ ...doctorForm, startTime24: event.target.value, startTime: new Date(`1970-01-01T${event.target.value}:00`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) })} /></label></div>}<div className="patient-form-actions"><button type="button" className="outline-button delete-cancel" onClick={() => setDoctorForm(null)}>Cancel</button><button className="primary-button" type="submit"><Save size={15} /> Save changes</button></div></div></form></div>}
    </section>
  )
}

function MedicalTestResultForm({ patient, initialDoctor, onClose, onSave }) {
  const [testResult, setTestResult] = useState({
    category: 'Blood sugar',
    testName: '',
    result: '',
    unit: '',
    referenceRange: '',
    testedAt: getSriLankaDateKey(new Date()),
    doctor: initialDoctor || '',
    notes: '',
  })

  const updateField = (field, value) => setTestResult((current) => ({ ...current, [field]: value }))

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="modal test-result-modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave(testResult) }}>
        <div className="modal-heading">
          <div><p className="eyebrow">Laboratory results</p><h2>Record test result</h2><p className="modal-subtitle">{patient.name} · {patient.id}</p></div>
          <button type="button" className="icon-button" aria-label="Close test result form" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="patient-add-form">
          <div className="form-row">
            <label>Report type<select value={testResult.category} onChange={(event) => updateField('category', event.target.value)}><option>Blood sugar</option><option>Cholesterol</option><option>Urine test</option><option>Other test</option></select></label>
            <label>Test name<input required value={testResult.testName} onChange={(event) => updateField('testName', event.target.value)} placeholder="Enter test name" /></label>
          </div>
          <div className="form-row">
            <label>Result<input required value={testResult.result} onChange={(event) => updateField('result', event.target.value)} placeholder="Enter measured result" /></label>
            <label>Unit<input value={testResult.unit} onChange={(event) => updateField('unit', event.target.value)} placeholder="e.g. mmol/L" /></label>
          </div>
          <div className="form-row">
            <label>Reference range<input value={testResult.referenceRange} onChange={(event) => updateField('referenceRange', event.target.value)} placeholder="Enter the lab reference range" /></label>
            <label>Test date<input type="date" required value={testResult.testedAt} onChange={(event) => updateField('testedAt', event.target.value)} /></label>
          </div>
          <label>Doctor / requested by<input required value={testResult.doctor} onChange={(event) => updateField('doctor', event.target.value)} placeholder="Name of doctor or requester" /></label>
          <label>Notes<textarea rows="3" value={testResult.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Optional lab notes or interpretation" /></label>
          <div className="patient-form-actions">
            <button type="button" className="outline-button delete-cancel" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit"><Save size={15} /> Save result</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function MedicalReportsSection({ patientHistory, appointments = [], reports = [], onAdd, onView }) {
  const patientReports = reports
    .filter((report) => String(report.patientId).toLowerCase() === String(patientHistory.id).toLowerCase())
    .sort((first, second) => String(second.testedAt).localeCompare(String(first.testedAt)))
  const doctorGroupsByName = new Map()
  const getDoctorGroup = (doctorName) => {
    const doctor = String(doctorName || '').trim() || 'Unassigned doctor'
    const key = doctor.toLowerCase()
    if (!doctorGroupsByName.has(key)) doctorGroupsByName.set(key, { doctor, visits: [], reports: [] })
    return doctorGroupsByName.get(key)
  }
  appointments.forEach((appointment) => getDoctorGroup(appointment.doctor).visits.push(appointment))
  patientReports.forEach((report) => getDoctorGroup(report.doctor).reports.push(report))
  const doctorGroups = Array.from(doctorGroupsByName.values())
    .sort((first, second) => first.doctor.localeCompare(second.doctor))

  return (
    <section className="history-documents">
      <div className="history-documents-heading report-section-heading">
        <div><span className="history-doctor-label">Medical history</span><strong>Appointments and reports by doctor</strong></div>
        <div className="report-section-actions">
          <button type="button" className="outline-button add-test-result-button" onClick={onAdd}><Plus size={14} /> Add test result</button>
        </div>
      </div>
      {doctorGroups.map(({ doctor, visits, reports: doctorReports }) => {
        const doctorId = visits[0]?.doctorId || '--'
        return (
          <div className="history-doctor-group" key={`${patientHistory.id}-${doctor}`}>
            <div className="history-doctor-header">
              <div><span className="history-doctor-label">Doctor</span><strong>{doctor}</strong>{doctorId !== '--' && <small>{doctorId}</small>}</div>
              <span className="history-visit-total">{visits.length} appointment{visits.length === 1 ? '' : 's'} · {doctorReports.length} report{doctorReports.length === 1 ? '' : 's'}</span>
            </div>
            {visits.length > 0 && <div className="history-doctor-items">
              {visits.map((record) => (
                <div className="history-item" key={record.id || `${record.day}-${record.date}-${record.time}-${record.doctor}`}>
                  <div className="history-icon-badge"><History size={14} /></div>
                  <div className="history-item-content">
                    <strong>{formatAppointmentDate(getAppointmentDate(record))}</strong>
                    <span>{record.time || 'Time not recorded'}</span>
                    <span>Appointment no: {record.number || '--'}</span>
                    <span>Doctor ID: {record.doctorId || doctorId}</span>
                  </div>
                </div>
              ))}
            </div>}
            {doctorReports.length > 0 && <div className="history-doctor-items">
              {doctorReports.map((report) => (
                <div className="history-item document-item" key={report.id}>
                  <div className="history-icon-badge"><FileText size={14} /></div>
                  <div className="history-item-content">
                    <strong>{report.category} · {report.testName}</strong>
                    <span>Result: {report.result}{report.unit ? ` ${report.unit}` : ''}</span>
                    <span>Tested {report.testedAt ? formatAppointmentDate(report.testedAt) : 'Date not recorded'}</span>
                    {report.referenceRange && <span>Reference range: {report.referenceRange}</span>}
                    <span className="history-document-actions">
                      <button type="button" className="text-button small-text-button" onClick={() => onView(report)}>View report</button>
                      <button type="button" className="text-button small-text-button" onClick={() => createMedicalReportPdf(report)}>Download PDF</button>
                    </span>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        )
      })}
      {doctorGroups.length === 0 && <p className="empty-history">No appointments or reports recorded for this patient yet.</p>}
    </section>
  )
}

function App() {
  const [activePage, setActivePage] = useState(() => readStored('hms-active-page', 'Overview'))
  const [patientSearch, setPatientSearch] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isBackendReady, setIsBackendReady] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [backendError, setBackendError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showResetMessage, setShowResetMessage] = useState(false)
  const [newAppointmentPatient, setNewAppointmentPatient] = useState('')
  const [newAppointmentDoctor, setNewAppointmentDoctor] = useState('Dr. Praveena Edirimuni')
  const [newAppointmentTime, setNewAppointmentTime] = useState('09:00')
  const [newAppointmentDate, setNewAppointmentDate] = useState(() => readStored('hms-new-appointment-date', getSriLankaDateKey(new Date())))
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [profile, setProfile] = useState(() => readStored('hms-profile', { fullName: 'Alex Doe' }))
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => readStored('hms-selected-date', getSriLankaDateKey(new Date())))
  const selectedDay = selectedDate.slice(8, 10)

  useEffect(() => {
    window.localStorage.setItem('hms-backend-ready', 'false')
    let mounted = true
    checkSession()
      .then(({ authenticated }) => {
        if (mounted) setIsAuthenticated(authenticated)
      })
      .catch((error) => {
        if (mounted) setAuthError(`Backend unavailable: ${error.message}`)
      })
      .finally(() => {
        if (mounted) setIsCheckingSession(false)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const showBackendError = (event) => setBackendError(`Could not save changes to the server: ${event.detail}`)
    window.addEventListener('hms-backend-error', showBackendError)
    return () => window.removeEventListener('hms-backend-error', showBackendError)
  }, [])

  useEffect(() => {
    const updateProfile = () => setProfile(readStored('hms-profile', { fullName: 'Alex Doe' }))
    window.addEventListener('hms-profile-updated', updateProfile)
    window.addEventListener('storage', updateProfile)
    return () => {
      window.removeEventListener('hms-profile-updated', updateProfile)
      window.removeEventListener('storage', updateProfile)
    }
  }, [])

  useEffect(() => {
    const clock = window.setInterval(() => setCurrentTime(new Date()), 60000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('hms-selected-date', JSON.stringify(selectedDate))
  }, [selectedDate])

  useEffect(() => {
    window.localStorage.setItem('hms-new-appointment-date', JSON.stringify(newAppointmentDate))
  }, [newAppointmentDate])

  const navigation = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Patients', icon: UsersRound },
    { label: 'Doctors', icon: Stethoscope },
    { label: 'Appointments', icon: CalendarDays },
    { label: 'Medical records', icon: FileText },
    { label: 'Laboratory', icon: FlaskConical },
    { label: 'Pharmacy', icon: Pill },
    { label: 'Billing', icon: WalletCards },
  ]

  const hospitalDoctors = [
    { name: 'Dr. Vinitha Jayamanna', specialty: 'General Medicine', color: 'blue', startTime: '09:00 AM' },
    { name: 'Dr. Jayamini S Fernando', specialty: 'Cardiology', color: 'amber', startTime: '10:00 AM' },
    { name: 'Dr. Sumeda Basnayake', specialty: 'Pediatrics', color: 'green', startTime: '11:30 AM' },
    { name: 'Dr. Susantha Jayasuriya', specialty: 'Orthopedics', color: 'rose', startTime: '01:00 PM' },
    { name: 'Dr. Vimukthi Senanayake', specialty: 'Neurology', color: 'blue', startTime: '02:30 PM' },
    { name: 'Dr. Rashiprabha Sewmini', specialty: 'Dermatology', color: 'amber', startTime: '03:30 PM' },
    { name: 'Dr. Rashmini Wijemanna', specialty: 'Obstetrics & Gynecology', color: 'green', startTime: '08:30 AM' },
    { name: 'Dr. Chaya Udawaththa', specialty: 'Oncology', color: 'rose', startTime: '09:30 AM' },
    { name: 'Dr. Sashini Jayakodi', specialty: 'Endocrinology', color: 'blue', startTime: '10:30 AM' },
    { name: 'Dr. Pubudu Gajadeera', specialty: 'Pulmonology', color: 'amber', startTime: '12:00 PM' },
    { name: 'Dr. Praveena Edirimuni', specialty: 'Gastroenterology', color: 'green', startTime: '01:30 PM' },
    { name: 'Dr. Kaveesha Edirimanna', specialty: 'ENT', color: 'rose', startTime: '03:00 PM' },
    { name: 'Dr. Oshadee Samaravikrama', specialty: 'Ophthalmology', color: 'blue', startTime: '09:15 AM' },
    { name: 'Dr. Shantha Bandara', specialty: 'Urology', color: 'amber', startTime: '11:00 AM' },
    { name: 'Dr. Geethani Devindi', specialty: 'Nephrology', color: 'green', startTime: '02:00 PM' },
    { name: 'Dr. Subashi Nilame', specialty: 'Psychiatry', color: 'rose', startTime: '04:00 PM' },
    { name: 'Dr. Nilusha Karavita', specialty: 'Rheumatology', color: 'blue', startTime: '10:15 AM' },
    { name: 'Dr. Madusha Withanage', specialty: 'Anesthesiology', color: 'amber', startTime: '12:30 PM' },
    { name: 'Dr. Zabira Anthane', specialty: 'Emergency Medicine', color: 'green', startTime: '08:00 AM' },
  ]
  const [doctorRoster, setDoctorRoster] = useState(() => readStored('hms-doctors', hospitalDoctors))

  const [appointments, setAppointments] = useState(() => {
    const resetKey = 'hms-appointment-number-reset-v3'

    const storedAppointments = readStored('hms-appointments', [
      { day: '18', time: '09:00', doctor: 'Dr. Vinitha Jayamanna', patient: 'Amelia Rodriguez' },
      { day: '18', time: '10:30', doctor: 'Dr. Jayamini S Fernando', patient: 'Michael Chen' },
      { day: '19', time: '09:30', doctor: 'Dr. Sumeda Basnayake', patient: 'Noah Williams' },
      { day: '19', time: '11:00', doctor: 'Dr. Susantha Jayasuriya', patient: 'Sophia Williams' },
      { day: '20', time: '09:00', doctor: 'Dr. Vinitha Jayamanna', patient: 'Amelia Rodriguez' },
      { day: '20', time: '10:30', doctor: 'Dr. Jayamini S Fernando', patient: 'Michael Chen' },
      { day: '20', time: '12:00', doctor: 'Dr. Sumeda Basnayake', patient: 'Sophia Williams' },
      { day: '20', time: '14:30', doctor: 'Dr. Vimukthi Senanayake', patient: 'Noah Williams' },
      { day: '21', time: '08:30', doctor: 'Dr. Susantha Jayasuriya', patient: 'Amelia Rodriguez' },
      { day: '22', time: '09:00', doctor: 'Dr. Vinitha Jayamanna', patient: 'Michael Chen' },
    ])
    const appointmentGroups = new Map()
    storedAppointments.forEach((appointment) => {
      const key = `${appointment.doctor}-${appointment.day}`
      const group = appointmentGroups.get(key) || []
      group.push(appointment)
      appointmentGroups.set(key, group)
    })
    appointmentGroups.forEach((group) => group.sort((first, second) => first.time.localeCompare(second.time)))
    const resetAppointments = storedAppointments.map((appointment, index) => {
      const key = `${appointment.doctor}-${appointment.day}`
      const appointmentNumber = appointmentGroups.get(key).indexOf(appointment) + 1
      return { ...appointment, id: appointment.id || `APT-${String(index + 1).padStart(4, '0')}`, status: appointment.status || 'Confirmed', number: `AN - ${String(appointmentNumber).padStart(2, '0')}` }
    })
    saveStored('hms-appointments', resetAppointments)
    window.localStorage.setItem(resetKey, JSON.stringify(true))
    return resetAppointments
  })
  const [patientRows, setPatientRows] = useState(() => readStored('hms-patients', [
    ['Amelia Rodriguez', 'PT-20481', 'Dr. Vinitha Jayamanna', '+94 77 123 4567'],
    ['Michael Chen', 'PT-20480', 'Dr. Jayamini S Fernando', '+94 71 987 6543'],
    ['Sophia Williams', 'PT-20479', 'Dr. Sumeda Basnayake', '+94 76 345 2211'],
    ['Noah Williams', 'PT-20478', 'Dr. Susantha Jayasuriya', '+94 75 664 3322'],
  ]))
  const [medicineReceipts, setMedicineReceipts] = useState(() => {
    const storedReceipts = readStored('hms-medicine-receipts', null)
    const previousReceipts = [
      { patientId: 'PT-20481', receiptNumber: 'RX-20481', date: '2026-09-20', items: [{ name: 'Paracetamol 500 mg', dosage: '1 tablet every 6 hours as needed' }, { name: 'Cetirizine 10 mg', dosage: '1 tablet once daily' }, { name: 'Omeprazole 20 mg', dosage: '1 capsule once daily before breakfast' }, { name: 'Vitamin C 500 mg', dosage: '1 tablet once daily' }] },
      { patientId: 'PT-20480', receiptNumber: 'RX-20480', date: '2026-09-22', items: [{ name: 'Atorvastatin 10 mg', dosage: '1 tablet once daily in the evening' }, { name: 'Amlodipine 5 mg', dosage: '1 tablet once daily' }, { name: 'Metformin 500 mg', dosage: '1 tablet twice daily with meals' }, { name: 'Omeprazole 20 mg', dosage: '1 capsule once daily before breakfast' }] },
      { patientId: 'PT-20479', receiptNumber: 'RX-20479', date: '2026-09-20', items: [{ name: 'Oral rehydration salts', dosage: 'Dissolve 1 sachet in water as directed' }, { name: 'Paracetamol 500 mg', dosage: '1 tablet every 6 hours as needed' }, { name: 'Zinc 20 mg', dosage: '1 tablet once daily' }, { name: 'Probiotic capsules', dosage: '1 capsule once daily' }] },
      { patientId: 'PT-20478', receiptNumber: 'RX-20478', date: '2026-09-20', items: [{ name: 'Salbutamol inhaler', dosage: 'Use 1–2 puffs as prescribed' }, { name: 'Cetirizine 10 mg', dosage: '1 tablet once daily' }, { name: 'Paracetamol 500 mg', dosage: '1 tablet every 6 hours as needed' }, { name: 'Vitamin D3 1000 IU', dosage: '1 tablet once daily' }] },
    ]
    if (Array.isArray(storedReceipts)) {
      const updatedReceipts = storedReceipts.map((receipt) => {
        if (!receipt.id?.startsWith('PREVIOUS-') || !Array.isArray(receipt.items) || receipt.items.length >= 4) return receipt
        const seededReceipt = previousReceipts.find((previousReceipt) => previousReceipt.patientId === receipt.patientId)
        if (!seededReceipt) return receipt
        const existingNames = new Set(receipt.items.map((item) => item.name))
        const items = [...receipt.items, ...seededReceipt.items.filter((item) => !existingNames.has(item.name))]
        return { ...receipt, items }
      })
      if (updatedReceipts.some((receipt, index) => receipt !== storedReceipts[index])) {
        saveStored('hms-medicine-receipts', updatedReceipts)
      }
      return updatedReceipts
    }

    const receipts = previousReceipts.flatMap((receipt) => {
      const patient = patientRows.find(([, patientId]) => patientId === receipt.patientId)
      if (!patient) return []
      const appointment = appointments.find((record) => record.patientId === receipt.patientId || record.patient === patient[0])
      return [{ ...receipt, id: `PREVIOUS-${receipt.patientId}`, patientName: patient[0], doctor: appointment?.doctor || patient[2] || '' }]
    })
    saveStored('hms-medicine-receipts', receipts)
    return receipts
  })
  const [medicalRecords, setMedicalRecords] = useState(() => {
    const storedRecords = readStored('hms-medical-records', [])
    const initialRecords = Array.isArray(storedRecords)
      ? storedRecords.filter((record) => record && (record.patient || record.patientId)).reduce((records, record) => upsertMedicalRecord(records, record), [])
      : []
    const sampleRecordDates = {
      'PT-20481': '2026-09-20',
      'PT-20480': '2026-09-22',
      'PT-20479': '2026-09-20',
      'PT-20478': '2026-09-20',
    }
    const recordsWithSamples = Object.entries(sampleRecordDates).reduce((records, [patientId, lastVisit]) => {
      const patient = patientRows.find(([, id]) => id === patientId)
      if (!patient || records.some((record) => record.patientId === patientId)) return records
      return [...records, { patient: patient[0], patientId, contact: patient[3] || '', lastVisit }]
    }, initialRecords)
    return appointments.reduce((records, appointment) => {
      const record = getMedicalRecordFromAppointment(appointment, patientRows)
      return record ? upsertMedicalRecord(records, record) : records
    }, recordsWithSamples)
  })
  const [patientToDelete, setPatientToDelete] = useState(null)
  const [appointmentToDelete, setAppointmentToDelete] = useState(null)
  const [patientToEdit, setPatientToEdit] = useState(null)
  const [patientHistory, setPatientHistory] = useState(null)
  const [selectedMedicalReport, setSelectedMedicalReport] = useState(null)
  const [showTestResultForm, setShowTestResultForm] = useState(false)
  const [patientDocuments, setPatientDocuments] = useState(() => readStored('hms-patient-documents', {}))
  const [medicalTestResults, setMedicalTestResults] = useState(() => {
    const storedResults = readStored('hms-patient-test-results', [])
    const initialReports = Array.isArray(storedResults)
      ? storedResults.filter((result) => result && result.patientId && result.result)
      : []

    const previousReports = [
      { patientId: 'PT-20481', category: 'Blood sugar', testName: 'Fasting blood glucose', result: '92', unit: 'mg/dL', referenceRange: '70–99 mg/dL', testedAt: '2026-09-20', notes: 'Previous patient record.' },
      { patientId: 'PT-20480', category: 'Cholesterol', testName: 'Total cholesterol', result: '176', unit: 'mg/dL', referenceRange: 'Below 200 mg/dL', testedAt: '2026-09-22', notes: 'Previous patient record.' },
      { patientId: 'PT-20479', category: 'Urine test', testName: 'Urinalysis', result: 'Negative', referenceRange: 'Negative', testedAt: '2026-09-20', notes: 'Previous patient record.' },
      { patientId: 'PT-20478', category: 'Other test', testName: 'Complete blood count', result: 'Within listed reference ranges', referenceRange: 'See laboratory reference intervals', testedAt: '2026-09-20', notes: 'Previous patient record.' },
    ]
    const seedReports = previousReports.flatMap((report) => {
      const patient = patientRows.find(([, patientId]) => patientId === report.patientId)
      if (!patient) return []
      const appointment = appointments.find((record) => record.patientId === report.patientId || record.patient === patient[0])
      return [{
        ...report,
        id: `PREVIOUS-${report.patientId}`,
        patientName: patient[0],
        doctor: appointment?.doctor || patient[2] || '',
        reportNumber: `MR-${report.patientId.slice(-5)}`,
      }]
    })
    const userReports = initialReports.filter((report) => !String(report.id || '').startsWith('PREVIOUS-'))
    const updatedReports = [...userReports, ...seedReports]
    if (JSON.stringify(updatedReports) !== JSON.stringify(initialReports)) {
      saveStored('hms-patient-test-results', updatedReports)
    }
    return updatedReports
  })
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [patientAddedNotice, setPatientAddedNotice] = useState('')
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientId, setNewPatientId] = useState(() => {
    const storedId = readStored('hms-next-patient-id', 'PT-20482')
    return storedId
  })
  const [newPatientContact, setNewPatientContact] = useState('070 000 0000')
  const [newPatientAddress, setNewPatientAddress] = useState('')

  const formatSriLankaContact = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 10)
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  }

  const [newPatientsToday, setNewPatientsToday] = useState(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const storedDate = readStored('hms-new-patients-date', '')
    const storedValue = readStored('hms-new-patients-today', 0)
    if (storedDate !== todayKey) {
      window.localStorage.setItem('hms-new-patients-date', JSON.stringify(todayKey))
      window.localStorage.setItem('hms-new-patients-today', JSON.stringify(0))
      return 0
    }
    return storedValue
  })

  useEffect(() => {
    saveStored('hms-medical-records', medicalRecords)
  }, [medicalRecords])

  const initialBackendState = useRef(null)
  if (initialBackendState.current === null) {
    initialBackendState.current = {
      'hms-appointments': appointments,
      'hms-patients': patientRows,
      'hms-medical-records': medicalRecords,
      'hms-patient-test-results': medicalTestResults,
      'hms-patient-documents': patientDocuments,
      'hms-medicine-receipts': medicineReceipts,
      'hms-profile': profile,
      'hms-doctors': doctorRoster,
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      window.localStorage.setItem('hms-backend-ready', 'false')
      return undefined
    }

    let active = true
    window.localStorage.setItem('hms-backend-ready', 'false')
    const initialState = initialBackendState.current

    loadBackendState()
      .then(async (storedState) => {
        const restoredState = {}
        const missingState = []
        for (const key of backendStateKeys) {
          let value = storedState[key]
          if (value === undefined) {
            const cachedValue = window.localStorage.getItem(key)
            value = cachedValue === null ? initialState[key] : readStored(key, initialState[key])
            if (value !== undefined) missingState.push([key, value])
          }
          if (value !== undefined) {
            restoredState[key] = value
            window.localStorage.setItem(key, JSON.stringify(value))
          }
        }

        await Promise.all(missingState.map(([key, value]) => saveBackendState(key, value)))
        if (!active) return
        if (Array.isArray(restoredState['hms-appointments'])) setAppointments(restoredState['hms-appointments'])
        if (Array.isArray(restoredState['hms-patients'])) setPatientRows(restoredState['hms-patients'])
        if (Array.isArray(restoredState['hms-medical-records'])) setMedicalRecords(restoredState['hms-medical-records'])
        if (Array.isArray(restoredState['hms-patient-test-results'])) setMedicalTestResults(restoredState['hms-patient-test-results'])
        if (restoredState['hms-patient-documents'] && typeof restoredState['hms-patient-documents'] === 'object') setPatientDocuments(restoredState['hms-patient-documents'])
        if (Array.isArray(restoredState['hms-medicine-receipts'])) setMedicineReceipts(restoredState['hms-medicine-receipts'])
        if (restoredState['hms-profile'] && typeof restoredState['hms-profile'] === 'object') setProfile(restoredState['hms-profile'])
        if (Array.isArray(restoredState['hms-doctors'])) setDoctorRoster(restoredState['hms-doctors'])
        window.localStorage.setItem('hms-backend-ready', 'true')
        setBackendError('')
        setIsBackendReady(true)
      })
      .catch((error) => {
        if (active) setBackendError(`Could not load data from MySQL: ${error.message}`)
      })

    return () => { active = false }
  }, [isAuthenticated])

  const getScheduledDoctors = (day) => {
    const startIndex = (((Number(day) - 18) * 5) % doctorRoster.length + doctorRoster.length) % doctorRoster.length
    return Array.from({ length: Math.min(5, doctorRoster.length) }, (_, index) => doctorRoster[(startIndex + index) % doctorRoster.length])
  }
  const doctors = getScheduledDoctors(selectedDay)
  const handleDayChange = (dateKey) => {
    const day = dateKey.slice(8, 10)
    const scheduledDoctors = getScheduledDoctors(day)
    setSelectedDate(dateKey)
    setNewAppointmentDoctor((currentDoctor) => scheduledDoctors.some((doctor) => doctor.name === currentDoctor) ? currentDoctor : scheduledDoctors[0]?.name || '')
  }

  const moveSchedule = (days) => {
    const nextDate = shiftDateKey(selectedDate, days)
    handleDayChange(nextDate)
  }

  const handleDeletePatient = (patientId) => {
    const patient = patientRows.find(([, id]) => id === patientId)
    if (!patient) return
    setPatientToDelete({ id: patientId, name: patient[0] })
  }

  const updateAppointmentRecords = (updateRecord) => {
    setAppointments((records) => {
      const updatedRecords = records.map(updateRecord)
      saveStored('hms-appointments', updatedRecords)
      return updatedRecords
    })
  }

  const getDoctorId = (doctorName) => {
    const doctorIndex = doctorRoster.findIndex((doctor) => doctor.name === doctorName)
    return doctorIndex < 0 ? '--' : `DR-${String(doctorIndex + 1).padStart(4, '0')}`
  }

  const handleSaveMedicalTestResult = (testResult) => {
    if (!patientHistory) return
    const createdAt = Date.now()
    const savedResult = {
      ...testResult,
      id: `MR-${createdAt}`,
      patientName: patientHistory.name,
      patientId: patientHistory.id,
      doctor: testResult.doctor.trim(),
      testName: testResult.testName.trim(),
      result: testResult.result.trim(),
      unit: testResult.unit.trim(),
      referenceRange: testResult.referenceRange.trim(),
      notes: testResult.notes.trim(),
      reportNumber: `MR-${String(createdAt).slice(-8)}`,
      createdAt,
    }
    const updatedResults = [...medicalTestResults, savedResult]
    try {
      saveStored('hms-patient-test-results', updatedResults)
    } catch {
      setPatientAddedNotice('Could not save this test result. Browser storage may be full.')
      return
    }
    setMedicalTestResults(updatedResults)
    setShowTestResultForm(false)
    setPatientAddedNotice('Test result saved to patient history')
    window.setTimeout(() => setPatientAddedNotice(''), 1800)
  }

  const handleBookAppointment = (appointment) => {
    const patient = patientRows.find(([, id]) => String(id).trim().toLowerCase() === String(appointment.patientId || '').trim().toLowerCase())
      || patientRows.find(([name]) => String(name).trim().toLowerCase() === String(appointment.patient || '').trim().toLowerCase())
    const patientAppointment = {
      ...appointment,
      patientId: patient?.[1] || appointment.patientId.trim(),
      patient: patient?.[0] || appointment.patient.trim(),
      contact: patient?.[3] || appointment.contact.trim(),
    }
    const day = patientAppointment.date.slice(8, 10)
    const doctorAppointments = appointments.filter((record) => record.doctor === patientAppointment.doctor && record.day === day && record.status !== 'Cancelled')
    if (doctorAppointments.length >= 40) return
    const createdAt = Date.now()
    const createdAppointment = {
      ...patientAppointment,
      id: `APT-${createdAt}`,
      createdAt,
      day,
      doctorId: patientAppointment.doctorId || getDoctorId(patientAppointment.doctor),
      status: 'Confirmed',
      number: `AN - ${String(doctorAppointments.length + 1).padStart(2, '0')}`,
    }
    setAppointments((records) => {
      const updatedRecords = [...records, createdAppointment]
      saveStored('hms-appointments', updatedRecords)
      return updatedRecords
    })
    const medicalRecord = getMedicalRecordFromAppointment(createdAppointment, patientRows)
    if (medicalRecord) {
      setMedicalRecords((records) => {
        const updatedRecords = upsertMedicalRecord(records, medicalRecord)
        saveStored('hms-medical-records', updatedRecords)
        return updatedRecords
      })
    }
  }

  const handleCancelAppointment = (appointment) => updateAppointmentRecords((record) => record.id === appointment.id ? { ...record, status: 'Cancelled' } : record)
  const handleDeleteAppointment = (appointment) => setAppointmentToDelete(appointment)
  const confirmDeleteAppointment = () => {
    if (!appointmentToDelete) return
    setAppointments((records) => {
      const updatedRecords = records.filter((record) => record.id !== appointmentToDelete.id)
      saveStored('hms-appointments', updatedRecords)
      return updatedRecords
    })
    setAppointmentToDelete(null)
  }
  const handleRescheduleAppointment = (appointment) => {
    const day = appointment.date.slice(8, 10)
    const doctorAppointments = appointments.filter((record) => record.id !== appointment.id && record.doctor === appointment.doctor && record.day === day && record.status !== 'Cancelled')
    if (doctorAppointments.length >= 40) return
    const patientRecord = getMedicalRecordFromAppointment(appointment, patientRows)
    if (patientRecord) {
      setMedicalRecords((records) => {
        const updatedRecords = upsertMedicalRecord(records, patientRecord)
        saveStored('hms-medical-records', updatedRecords)
        return updatedRecords
      })
    }
    setAppointments((records) => {
      const updatedRecords = records.map((record) => record.id === appointment.id ? { ...record, ...appointment, day, doctorId: appointment.doctorId || getDoctorId(appointment.doctor), status: 'Rescheduled', number: `AN - ${String(doctorAppointments.length + 1).padStart(2, '0')}` } : record)
      saveStored('hms-appointments', updatedRecords)
      return updatedRecords
    })
  }
  const handleStatusChange = (appointment) => {
    const nextStatus = appointment.status === 'Confirmed' ? 'Completed' : appointment.status === 'Completed' ? 'Waiting' : 'Confirmed'
    updateAppointmentRecords((record) => record.id === appointment.id ? { ...record, status: nextStatus } : record)
  }

  const handleEditPatient = (row) => {
    const [name, id, doctor, contact, address] = row
    setPatientToEdit({ name, id, doctor, contact, address: address || '' })
  }

  const handleSavePatientEdit = (event) => {
    event.preventDefault()
    if (!patientToEdit?.name.trim() || !patientToEdit.contact.trim()) return
    setPatientRows((currentRows) => {
      const updatedRows = currentRows.map((row) => row[1] === patientToEdit.id
        ? [patientToEdit.name.trim(), row[1], row[2], patientToEdit.contact.trim(), patientToEdit.address.trim()]
        : row)
      saveStored('hms-patients', updatedRows)
      return updatedRows
    })
    setPatientToEdit(null)
    setPatientAddedNotice('Patient information updated')
    window.setTimeout(() => setPatientAddedNotice(''), 1800)
  }

  const handleViewPatientHistory = (row) => {
    const [name, id, doctor] = row
    const patientAppointments = appointments
      .filter((record) => record.patientId === id || record.patient === name)
      .sort((first, second) => getAppointmentDate(second).localeCompare(getAppointmentDate(first)))
      .map((record) => ({ ...record, doctorId: record.doctorId || getDoctorId(record.doctor) }))
    setPatientHistory({ name, id, doctor: doctor || patientAppointments[0]?.doctor || 'No doctor recorded', appointments: patientAppointments })
  }

  const handleViewMedicalRecordHistory = ([name, id]) => {
    const patientAppointments = appointments
      .filter((record) => record.patientId === id || (!record.patientId && record.patient === name))
      .sort((first, second) => getAppointmentDate(second).localeCompare(getAppointmentDate(first)))
      .map((record) => ({ ...record, doctorId: record.doctorId || getDoctorId(record.doctor) }))
    setPatientHistory({
      name,
      id,
      doctor: patientAppointments.length ? 'Appointment history' : 'No doctor recorded',
      appointments: patientAppointments,
    })
  }

  const handleUploadDocument = (row, file) => {
    const [, patientId] = row
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setPatientAddedNotice(`Could not read ${file.name}`)
        return
      }

      const base64Data = reader.result.split(',')[1]
      let pdfHeader
      try {
        pdfHeader = atob(base64Data.slice(0, 1400))
      } catch {
        setPatientAddedNotice('Please upload a valid PDF document.')
        return
      }
      if (!file.name.toLowerCase().endsWith('.pdf') || !base64Data || pdfHeader.indexOf('%PDF-') < 0 || pdfHeader.indexOf('%PDF-') > 1024) {
        setPatientAddedNotice('Only valid PDF documents can be uploaded.')
        return
      }

      const nextDocuments = {
        ...patientDocuments,
        [patientId]: [...(patientDocuments[patientId] || []), {
          name: file.name,
          size: file.size,
          type: 'application/pdf',
          dataUrl: `data:application/pdf;base64,${base64Data}`,
          uploadedAt: new Date().toISOString(),
        }],
      }
      try {
        saveStored('hms-patient-documents', nextDocuments)
      } catch {
        setPatientAddedNotice(`Could not save ${file.name}. Browser storage may be full.`)
        return
      }
      setPatientDocuments(nextDocuments)
      setPatientAddedNotice(`${file.name} uploaded`)
      window.setTimeout(() => setPatientAddedNotice(''), 1800)
    }
    reader.onerror = () => setPatientAddedNotice(`Could not read ${file.name}`)
    reader.readAsDataURL(file)
  }

  const confirmDeletePatient = () => {
    if (!patientToDelete) return

    setMedicalTestResults((results) => {
      const updatedResults = results.filter((result) => result.patientId !== patientToDelete.id)
      saveStored('hms-patient-test-results', updatedResults)
      return updatedResults
    })

    setMedicalRecords((records) => {
      const updatedRecords = records.filter((record) => record.patientId !== patientToDelete.id && record.patient !== patientToDelete.name)
      saveStored('hms-medical-records', updatedRecords)
      return updatedRecords
    })

    setPatientRows((currentRows) => {
      const updatedRows = currentRows.filter(([, id]) => id !== patientToDelete.id)
      saveStored('hms-patients', updatedRows)
      return updatedRows
    })

    setAppointments((records) => {
      const remainingRecords = records.filter((record) => record.patientId
        ? record.patientId !== patientToDelete.id
        : record.patient !== patientToDelete.name)
      const appointmentsByDoctorAndDay = new Map()

      remainingRecords.forEach((record) => {
        const key = `${record.doctor}-${record.day}`
        const group = appointmentsByDoctorAndDay.get(key) || []
        group.push(record)
        appointmentsByDoctorAndDay.set(key, group)
      })

      appointmentsByDoctorAndDay.forEach((group) => group.sort((first, second) => first.time.localeCompare(second.time)))

      const renumberedRecords = remainingRecords.map((record) => {
        const key = `${record.doctor}-${record.day}`
        const appointmentIndex = appointmentsByDoctorAndDay.get(key).indexOf(record) + 1
        return { ...record, number: `AN - ${String(appointmentIndex).padStart(2, '0')}` }
      })

      saveStored('hms-appointments', renumberedRecords)
      return renumberedRecords
    })
    setPatientToDelete(null)
  }

  const handleAddPatient = (event) => {
    event.preventDefault()

    if (!newPatientName.trim()) return

    const sanitizedDigits = newPatientContact.replace(/\D/g, '')
    if (sanitizedDigits.length !== 10 || !newPatientAddress.trim()) return

    const patientEntry = [newPatientName.trim(), newPatientId, '', newPatientContact, newPatientAddress.trim()]
    const updatedRows = [patientEntry, ...patientRows]
    setPatientRows(updatedRows)
    saveStored('hms-patients', updatedRows)

    setNewPatientsToday((currentCount) => {
      const nextCount = currentCount + 1
      window.localStorage.setItem('hms-new-patients-date', JSON.stringify(new Date().toISOString().slice(0, 10)))
      window.localStorage.setItem('hms-new-patients-today', JSON.stringify(nextCount))
      return nextCount
    })

    const nextIdNumber = Number(newPatientId.replace('PT-', '')) + 1
    const generatedId = `PT-${String(nextIdNumber).padStart(5, '0')}`
    window.localStorage.setItem('hms-next-patient-id', JSON.stringify(generatedId))
    setNewPatientName('')
    setNewPatientId(generatedId)
    setNewPatientContact('070 000 0000')
    setNewPatientAddress('')
    setShowPatientForm(false)
    setPatientAddedNotice('Successfully registered')
    window.setTimeout(() => setPatientAddedNotice(''), 1800)
  }
  const selectedDayAppointments = appointments.filter((appointment) => appointment.day === selectedDay)
  const medicalRecordRows = [...medicalRecords]
    .sort((first, second) => String(second.lastVisit || '').localeCompare(String(first.lastVisit || '')))
    .slice(0, -1)
    .map((record) => {
    const normalizedPatientId = String(record.patientId || '').trim().toLowerCase()
    const patient = patientRows.find(([, patientId]) => String(patientId).trim().toLowerCase() === normalizedPatientId)
    const appointment = appointments.find((entry) => String(entry.patientId || '').trim().toLowerCase() === normalizedPatientId
      && entry.patient
      && String(entry.patient).toLowerCase() !== 'confidential'
      && String(entry.patient).toLowerCase() !== 'new patient')
    const recordPatientName = String(record.patient || '').trim()
    const patientName = patient?.[0] || appointment?.patient || (recordPatientName.toLowerCase() === 'confidential' ? '' : recordPatientName) || '--'
    const lastVisit = record.lastVisit
      ? new Date(`${record.lastVisit}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      : '--'
    return [patientName, record.patientId || '--', lastVisit, patient?.[3] || record.contact || '--']
  })
  const channelingSchedule = doctors.map((doctor) => ({
    ...doctor,
    appointmentCount: selectedDayAppointments.filter((appointment) => appointment.doctor === doctor.name).length,
  }))
  const getDoctorDayAppointments = (doctorName, day) => appointments
    .filter((appointment) => appointment.doctor === doctorName && appointment.day === day && appointment.status !== 'Cancelled')
    .sort((first, second) => first.time.localeCompare(second.time))

  const getAppointmentNumber = (doctorName, day) => {
    const dayDoctorAppointments = getDoctorDayAppointments(doctorName, day)
    if (dayDoctorAppointments.length >= 40) return ''
    return `AN - ${String(dayDoctorAppointments.length + 1).padStart(2, '0')}`
  }

  const statCards = [
    { label: 'Total patients', value: '2,486', delta: '+12.5%', icon: UsersRound, tone: 'blue' },
    { label: "Today's appointments", value: '38', delta: '+8.2%', icon: CalendarDays, tone: 'green' },
    { label: 'New adding Today', value: String(newPatientsToday), delta: '+0.0%', icon: FlaskConical, tone: 'rose' },
  ]

  const handleNavigation = (label) => {
    window.localStorage.setItem('hms-active-page', JSON.stringify(label))
    setActivePage(label)
    setMobileNavOpen(false)
  }

  const handleLogout = () => {
    setShowAccountMenu(false)
    signOut()
      .then(() => {
        window.localStorage.setItem('hms-backend-ready', 'false')
        setIsBackendReady(false)
        setIsAuthenticated(false)
      })
      .catch((error) => setBackendError(`Could not sign out: ${error.message}`))
  }

  const handleProfileOption = (label) => {
    window.localStorage.setItem('hms-active-page', JSON.stringify(label))
    setActivePage(label)
    setShowProfileMenu(false)
  }

  if (isCheckingSession) {
    return <main className="login-page"><section className="login-card"><h1>Connecting securely</h1><p className="login-copy">Checking your hospital session...</p></section></main>
  }

  if (!isAuthenticated) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-brand">
            {!logoLoaded && <div className="brand-mark"><Stethoscope size={24} strokeWidth={2.5} /></div>}
            <img className={logoLoaded ? 'brand-logo-image' : 'brand-logo-image logo-hidden'} src="/medical-logo.jpg" alt="Medical Health Care logo" onLoad={() => setLogoLoaded(true)} onError={(event) => { event.currentTarget.style.display = 'none' }} />
            <div><strong>Medical</strong><span>HEALTH CARE</span></div>
          </div>
          <p className="eyebrow">Secure staff access</p>
          <h1>Welcome back</h1>
          <p className="login-copy">Sign in to continue managing your hospital workspace.</p>
          <form className="login-form" onSubmit={async (event) => {
            event.preventDefault()
            setAuthError('')
            setIsSigningIn(true)
            try {
              await signIn(loginUsername, loginPassword)
              setLoginPassword('')
              setIsAuthenticated(true)
            } catch (error) {
              setAuthError(error.message)
            } finally {
              setIsSigningIn(false)
            }
          }}>
            <label>Username<input required placeholder="Enter your username" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} autoComplete="username" /></label>
            <label>Password<div className="password-field"><input required type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            <button className="forgot-password" type="button" onClick={() => setShowResetMessage(true)}>Forgot password?</button>
            {showResetMessage && <p className="reset-message" role="status">Please contact your hospital administrator to reset your password.</p>}
            {(authError || backendError) && <p className="reset-message" role="alert">{authError || backendError}</p>}
            <button className="primary-button full-width" type="submit" disabled={isSigningIn}><LogIn size={16} /> {isSigningIn ? 'Signing in...' : 'Sign in'}</button>
          </form>
          <p className="login-footnote">Hospital Management System · Secure session</p>
        </section>
      </main>
    )
  }

  if (!isBackendReady) {
    return <main className="login-page"><section className="login-card"><h1>Loading hospital data</h1><p className="login-copy">Connecting to MySQL and restoring your saved workspace...</p>{backendError && <><p className="reset-message" role="alert">{backendError}</p><button className="primary-button full-width" type="button" onClick={() => window.location.reload()}>Retry connection</button><button className="forgot-password" type="button" onClick={handleLogout}>Sign out</button></>}</section></main>
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <img className={logoLoaded ? 'brand-logo-image' : 'brand-logo-image logo-hidden'} src="/medical-logo.jpg" alt="Medical Health Care logo" onLoad={() => setLogoLoaded(true)} onError={(event) => { event.currentTarget.style.display = 'none' }} />
          {!logoLoaded && <div className="brand-mark"><Stethoscope size={24} strokeWidth={2.5} /></div>}
          <div>
            <strong>Medical</strong>
            <span>HEALTH CARE</span>
          </div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={activePage === label ? 'nav-item active' : 'nav-item'} aria-current={activePage === label ? 'page' : undefined} onClick={() => handleNavigation(label)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-section-label">Management</div>
        <nav className="main-nav" aria-label="Management navigation">
          <button className={activePage === 'Staff' ? 'nav-item active' : 'nav-item'} aria-current={activePage === 'Staff' ? 'page' : undefined} onClick={() => handleNavigation('Staff')}><UserRound size={18} strokeWidth={1.8} /><span>Staff</span></button>
          <button className={activePage === 'Reports' ? 'nav-item active' : 'nav-item'} aria-current={activePage === 'Reports' ? 'page' : undefined} onClick={() => handleNavigation('Reports')}><Activity size={18} strokeWidth={1.8} /><span>Reports</span></button>
          <button className={activePage === 'Settings' ? 'nav-item active' : 'nav-item'} aria-current={activePage === 'Settings' ? 'page' : undefined} onClick={() => handleNavigation('Settings')}><Settings size={18} strokeWidth={1.8} /><span>Settings</span></button>
        </nav>

        <div className="sidebar-footer">
          <div className="help-panel">
            <div className="help-icon"><MessageSquare size={17} /></div>
            <strong>Need a hand?</strong>
            <p>Reach our support team</p>
            <button>Contact support <ArrowUpRight size={13} /></button>
          </div>
          <div className="user-menu-wrap">
            {showAccountMenu && <div className="account-menu"><button onClick={handleLogout}><LogOut size={15} /> Logout</button></div>}
          <button className={`user-chip ${['Profile', 'Change Password', 'Attendance'].includes(activePage) ? 'active' : ''}`} aria-expanded={showAccountMenu} onClick={() => setShowAccountMenu((visible) => !visible)}>
            <div className="avatar avatar-small">{getInitials(profile.fullName)}</div>
            <div><strong>{profile.fullName}</strong><span>Administrator</span></div>
            <ChevronDown size={15} className={`user-chevron ${showAccountMenu ? 'chevron-open' : ''}`} />
          </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input aria-label="Search patients" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Search patients..." /></label>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button>
            <div className="profile-menu-wrap">
              <button className="topbar-avatar avatar" aria-label="Open profile menu" aria-expanded={showProfileMenu} onClick={() => setShowProfileMenu((visible) => !visible)}>{getInitials(profile.fullName)}</button>
              {showProfileMenu && <div className="profile-menu" role="menu">
                <div className="profile-menu-heading"><strong>{profile.fullName}</strong><span>Administrator</span></div>
                <button role="menuitem" onClick={() => handleProfileOption('Profile')}><UserRound size={16} /> Profile</button>
                <button role="menuitem" onClick={() => handleProfileOption('Change Password')}><KeyRound size={16} /> Change Password</button>
                <button role="menuitem" onClick={() => handleProfileOption('Attendance')}><ClipboardCheck size={16} /> Attendance</button>
              </div>}
            </div>
          </div>
        </header>

        <div className="content-wrap">
          {patientAddedNotice && <div className="patient-added-toast" role="status">{patientAddedNotice}</div>}
          {activePage === 'Profile' && <ProfilePage />}
          {activePage === 'Change Password' && <ChangePasswordPage />}
          {activePage === 'Attendance' && <AttendancePage />}
          {activePage === 'Doctors' && <DoctorsPage doctors={doctorRoster} onSave={(updatedDoctors) => { setDoctorRoster(updatedDoctors); saveStored('hms-doctors', updatedDoctors) }} />}
          {activePage === 'Appointments' && <AppointmentsPage appointments={appointments} doctors={doctorRoster} getScheduledDoctors={getScheduledDoctors} patientRows={patientRows} patientSearch={patientSearch} onBookAppointment={handleBookAppointment} onCancelAppointment={handleCancelAppointment} onDeleteAppointment={handleDeleteAppointment} onRescheduleAppointment={handleRescheduleAppointment} onStatusChange={handleStatusChange} />}
          {activePage === 'Pharmacy' && <PharmacyPage patientRows={patientRows} appointments={appointments} />}
          {modulePages[activePage] && activePage !== 'Appointments' && activePage !== 'Pharmacy' && <ModulePage page={activePage} onAction={() => { if (activePage === 'Patients') setShowPatientForm(true); else setActivePage('Patients') }} patientRows={patientRows} medicalRecordRows={medicalRecordRows} medicineReceipts={medicineReceipts} onDeletePatient={handleDeletePatient} onEditPatient={handleEditPatient} onViewHistory={handleViewPatientHistory} onViewMedicalRecordHistory={handleViewMedicalRecordHistory} onUploadDocument={handleUploadDocument} patientSearch={patientSearch} />}
          {activePage === 'Patients' && showPatientForm && <div className="modal-backdrop" role="presentation" onClick={() => setShowPatientForm(false)}><form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleAddPatient}><div className="modal-heading"><div><p className="eyebrow">Patient registration</p><h2 id="patient-modal-title">Register Patient</h2></div><button type="button" className="icon-button" aria-label="Close patient registration" onClick={() => setShowPatientForm(false)}><X size={18} /></button></div><div className="patient-add-form"><div className="form-row"><label>Patient name<input value={newPatientName} onChange={(event) => setNewPatientName(event.target.value)} placeholder="Enter patient name" required /></label><label>Patient ID<input value={newPatientId} readOnly /></label></div><div className="form-row"><label>Contact<input required type="tel" inputMode="numeric" value={newPatientContact} maxLength={12} onChange={(event) => setNewPatientContact(formatSriLankaContact(event.target.value))} placeholder="070 000 0000" /></label><label>Address<input required value={newPatientAddress} onChange={(event) => setNewPatientAddress(event.target.value)} placeholder="Enter patient address" /></label></div><div className="patient-form-actions"><button type="button" className="outline-button delete-cancel" onClick={() => setShowPatientForm(false)}>Cancel</button><button className="primary-button" type="submit">Register Patient</button></div></div></form></div>}
          {patientToEdit && <div className="modal-backdrop" role="presentation" onClick={() => setPatientToEdit(null)}><form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSavePatientEdit}><div className="modal-heading"><div><p className="eyebrow">Patient management</p><h2>Update patient information</h2></div><button type="button" className="icon-button" aria-label="Close patient editor" onClick={() => setPatientToEdit(null)}><X size={18} /></button></div><div className="patient-add-form"><div className="form-row"><label>Patient name<input required value={patientToEdit.name} onChange={(event) => setPatientToEdit({ ...patientToEdit, name: event.target.value })} /></label><label>Patient ID<input value={patientToEdit.id} readOnly /></label></div><div className="form-row"><label>Contact<input required value={patientToEdit.contact} onChange={(event) => setPatientToEdit({ ...patientToEdit, contact: event.target.value })} /></label><label>Address<input required value={patientToEdit.address} onChange={(event) => setPatientToEdit({ ...patientToEdit, address: event.target.value })} /></label></div><div className="patient-form-actions"><button type="button" className="outline-button delete-cancel" onClick={() => setPatientToEdit(null)}>Cancel</button><button className="primary-button" type="submit"><Save size={15} /> Save changes</button></div></div></form></div>}
          {patientHistory && <div className="modal-backdrop" role="presentation" onClick={() => setPatientHistory(null)}><div className="modal history-modal" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Patient management</p><h2>Medical history</h2><p className="modal-subtitle">{patientHistory.name} · {patientHistory.id}</p></div><button type="button" className="icon-button" aria-label="Close medical history" onClick={() => setPatientHistory(null)}><X size={18} /></button></div><div className="history-summary"><div className="history-summary-top"><div><span className="history-summary-label">Patient</span><strong>{patientHistory.name}</strong></div><span className="history-patient-id">{patientHistory.id}</span></div><div className="history-summary-meta"><span>{patientHistory.appointments.length} appointments</span><span>{groupAppointmentsByDoctor(patientHistory.appointments, getDoctorId).length} doctors</span></div></div><div className="history-list"><MedicalReportsSection patientHistory={patientHistory} appointments={patientHistory.appointments} reports={medicalTestResults} onAdd={() => setShowTestResultForm(true)} onView={setSelectedMedicalReport} />{(patientDocuments[patientHistory.id] || []).length ? <div className="history-documents"><div className="history-documents-heading"><span className="history-doctor-label">Documents</span><strong>Uploaded files</strong></div>{(patientDocuments[patientHistory.id] || []).map((document) => <div className="history-item document-item" key={`${document.name}-${document.uploadedAt}`}><div className="history-icon-badge"><FileText size={14} /></div><div className="history-item-content"><strong>{document.name}</strong><span>Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</span>{document.dataUrl ? <span className="history-document-actions"><a href={document.dataUrl} target="_blank" rel="noreferrer">View</a><a href={document.dataUrl} download={document.name}>Download</a></span> : <span>File preview unavailable. Upload this document again to view it.</span>}</div></div>)}</div> : null}</div></div></div>}{showTestResultForm && patientHistory && <MedicalTestResultForm patient={patientHistory} initialDoctor={patientHistory.appointments[0]?.doctor || ''} onClose={() => setShowTestResultForm(false)} onSave={handleSaveMedicalTestResult} />}{selectedMedicalReport && <div className="modal-backdrop receipt-backdrop" role="presentation" onClick={() => setSelectedMedicalReport(null)}><div className="appointment-receipt medical-report-sheet" onClick={(event) => event.stopPropagation()}><div className="receipt-letterhead"><div className="receipt-brand-mark"><Stethoscope size={24} /></div><div><strong>Medical</strong><span>HEALTH CARE</span></div><div className="receipt-hospital-details">Clinical report<br />Medical Health Care HMS</div></div><div className="receipt-rule" /><div className="receipt-title"><p>Laboratory result</p><h2>Medical Report</h2></div><div className="receipt-details"><div><span>Patient Name:</span><strong>{selectedMedicalReport.patientName || '--'}</strong></div><div><span>Patient ID:</span><strong>{selectedMedicalReport.patientId || '--'}</strong></div><div><span>Doctor / Requested by:</span><strong>{selectedMedicalReport.doctor || '--'}</strong></div><div><span>Report No:</span><strong>{selectedMedicalReport.reportNumber || '--'}</strong></div><div><span>Test Date:</span><strong>{selectedMedicalReport.testedAt ? formatAppointmentDate(selectedMedicalReport.testedAt) : '--'}</strong></div><div><span>Test:</span><strong>{selectedMedicalReport.category} · {selectedMedicalReport.testName}</strong></div></div><div className="medical-report-summary"><h3>Test result</h3><div className="medical-report-result-grid"><div><span>Result</span><strong>{selectedMedicalReport.result}{selectedMedicalReport.unit ? ` ${selectedMedicalReport.unit}` : ''}</strong></div><div><span>Reference range</span><strong>{selectedMedicalReport.referenceRange || 'Not provided'}</strong></div></div>{selectedMedicalReport.notes && <p>{selectedMedicalReport.notes}</p>}</div><div className="receipt-footer"><span>Recorded laboratory result from patient history.</span><span>Medical Health Care</span></div><div className="receipt-actions"><button type="button" className="outline-button delete-cancel" onClick={() => setSelectedMedicalReport(null)}>Close</button><button type="button" className="primary-button" onClick={() => createMedicalReportPdf(selectedMedicalReport)}><Download size={15} /> Download PDF</button></div></div></div>}{patientToDelete && <div className="modal-backdrop" role="presentation" onClick={() => setPatientToDelete(null)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Confirm action</p><h2>Delete patient</h2></div><button type="button" className="icon-button" aria-label="Close delete confirmation" onClick={() => setPatientToDelete(null)}><X size={18} /></button></div><p className="delete-confirmation-text">Are you sure you want to delete <strong>{patientToDelete.name}</strong> from the database?</p><div className="delete-confirmation-actions"><button type="button" className="outline-button delete-cancel" onClick={() => setPatientToDelete(null)}>Cancel</button><button type="button" className="primary-button" onClick={confirmDeletePatient}>Delete</button></div></div></div>}
          {appointmentToDelete && <div className="modal-backdrop" role="presentation" onClick={() => setAppointmentToDelete(null)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Confirm action</p><h2>Delete appointment</h2></div><button type="button" className="icon-button" aria-label="Close appointment delete confirmation" onClick={() => setAppointmentToDelete(null)}><X size={18} /></button></div><p className="delete-confirmation-text">Are you sure you want to delete appointment <strong>{appointmentToDelete.number || '--'}</strong>?</p><div className="delete-confirmation-actions"><button type="button" className="outline-button delete-cancel" onClick={() => setAppointmentToDelete(null)}>Cancel</button><button type="button" className="primary-button" onClick={confirmDeleteAppointment}>Delete</button></div></div></div>}
          {activePage === 'Overview' && <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">{formatSriLankaDate(currentTime)} · Sri Lanka time</p>
              <h1>{getSriLankaGreeting(currentTime)}, {profile.fullName.split(' ')[0]} <span>✦</span></h1>
              <p className="heading-copy">Here is the pulse of your hospital today.</p>
            </div>
          </section>

          <section className="stat-grid" aria-label="Hospital overview">
            {statCards.map(({ label, value, delta, icon: Icon, tone }) => (
              <article className="stat-card" key={label}>
                <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
                <div className="stat-card-top"><span>{label}</span><button className="more-button" aria-label={`More options for ${label}`}><MoreHorizontal size={18} /></button></div>
                <div className="stat-value">{value}</div>
                <div className={`stat-delta ${delta.startsWith('-') ? 'down' : ''}`}><ArrowUpRight size={13} /> {delta} <span>vs last month</span></div>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="panel appointments-panel">
              <div className="panel-heading"><div><p className="eyebrow">Schedule</p><h2>Today's appointments</h2></div><button className="text-button" onClick={() => handleNavigation('Appointments')}>View calendar <ArrowUpRight size={14} /></button></div>
              <div className="date-strip"><button type="button" className="date-arrow" aria-label="Previous day" onClick={() => moveSchedule(-1)}><ChevronLeft size={18} /></button>{[-2, -1, 0, 1, 2].map((offset) => { const calendarDate = formatCalendarDate(shiftDateKey(selectedDate, offset)); return <button type="button" className={offset === 0 ? 'selected' : ''} key={calendarDate.key} onClick={() => handleDayChange(calendarDate.key)}><span>{calendarDate.day}</span><strong>{calendarDate.date}</strong></button> })}<button type="button" className="date-arrow" aria-label="Next day" onClick={() => moveSchedule(1)}><ChevronRight size={18} /></button></div>
              <div className="channeling-list">
                {channelingSchedule.map((doctor) => (
                  <div className="channeling-row" key={doctor.name}>
                    <div className={`appointment-avatar ${doctor.color}`}>{doctor.name.replace('Dr. ', '').split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                    <div className="doctor-info"><strong>{doctor.name}</strong><span>{doctor.specialty}</span></div>
                    <div className="doctor-start"><Clock3 size={14} /><span>Starts <strong>{doctor.startTime}</strong></span></div>
                    <div className="doctor-count"><strong>{doctor.appointmentCount}</strong><span>appointments</span></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel alerts-panel">
              <div className="panel-heading"><div><p className="eyebrow">Needs attention</p><h2>Clinical alerts</h2></div><button className="more-button" aria-label="More clinical alert options"><MoreHorizontal size={18} /></button></div>
              <div className="alert-summary"><div className="alert-ring"><span>07</span><small>open</small></div><div><strong>7 items need review</strong><p>Prioritized by urgency and due time</p></div></div>
              <div className="alert-list">
                <div className="alert-item"><div className="alert-item-icon warning"><AlertTriangle size={16} /></div><div><strong>Low stock: Amoxicillin</strong><span>Pharmacy · 12 minutes ago</span></div><ChevronDown size={15} /></div>
                <div className="alert-item"><div className="alert-item-icon lab"><FlaskConical size={16} /></div><div><strong>4 lab results ready</strong><span>Laboratory · 28 minutes ago</span></div><ChevronDown size={15} /></div>
                <div className="alert-item"><div className="alert-item-icon clock"><Clock3 size={16} /></div><div><strong>2 invoices overdue</strong><span>Billing · 1 hour ago</span></div><ChevronDown size={15} /></div>
              </div>
              <button className="outline-button">Review all alerts <ArrowUpRight size={14} /></button>
            </article>
          </section>

          <section className="lower-grid">
            <article className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">Live feed</p><h2>Recent activity</h2></div><button className="text-button">See all <ArrowUpRight size={14} /></button></div><div className="activity-row"><div className="activity-icon blue"><FileText size={16} /></div><div><strong>New patient registered</strong><span>Amelia Rodriguez was added to records</span></div><time>8 min ago</time></div><div className="activity-row"><div className="activity-icon green"><WalletCards size={16} /></div><div><strong>Payment received</strong><span>Invoice #INV-2084 · Rs. 320.00</span></div><time>32 min ago</time></div><div className="activity-row"><div className="activity-icon amber"><Pill size={16} /></div><div><strong>Prescription dispensed</strong><span>Michael Chen · 3 medicines</span></div><time>1 hr ago</time></div></article>
            <article className="panel occupancy-panel"><div className="panel-heading"><div><p className="eyebrow">Capacity</p><h2>Bed occupancy</h2></div><button className="select-button">Today <ChevronDown size={14} /></button></div><div className="occupancy-number"><strong>76<span>%</span></strong><span>38 of 50 beds occupied</span></div><div className="progress-bar"><span /></div><div className="occupancy-legend"><span><i className="dot blue-dot" />Occupied <strong>38</strong></span><span><i className="dot gray-dot" />Available <strong>12</strong></span></div><div className="occupancy-note"><Clock3 size={15} /> Average stay: <strong>3.8 days</strong></div></article>
          </section>
          </>}
        </div>
      </main>

      {showAppointmentForm && (() => {
        const appointmentDay = newAppointmentDate.slice(8, 10)
        const appointmentDoctors = getScheduledDoctors(appointmentDay)
        const selectedAppointmentDoctor = appointmentDoctors.some((doctor) => doctor.name === newAppointmentDoctor) ? newAppointmentDoctor : appointmentDoctors[0]?.name || ''
        const appointmentNumber = getAppointmentNumber(selectedAppointmentDoctor, appointmentDay) || 'FULL (30/30)'
        return (
          <div className="modal-backdrop" role="presentation" onClick={() => setShowAppointmentForm(false)}>
            <form className="modal appointment-modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const appointmentNumber = getAppointmentNumber(selectedAppointmentDoctor, appointmentDay); if (!appointmentNumber) return; setAppointments((records) => { const createdAt = Date.now(); const updatedRecords = [...records, { id: `APT-${createdAt}`, createdAt, day: appointmentDay, date: newAppointmentDate, time: newAppointmentTime, doctor: selectedAppointmentDoctor, patientId: newAppointmentPatient, patient: 'New patient', status: 'Confirmed', number: appointmentNumber }]; saveStored('hms-appointments', updatedRecords); return updatedRecords }); setShowAppointmentForm(false); setNewAppointmentPatient('') }}>
              <div className="modal-heading"><div><p className="eyebrow">Schedule</p><h2 id="appointment-modal-title">New appointment</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowAppointmentForm(false)}><X size={18} /></button></div>
              <div className="form-row"><label>Patient ID<input required value={newAppointmentPatient} onChange={(event) => setNewAppointmentPatient(event.target.value)} placeholder="PT-00000" /></label><label>Appointment number<input value={appointmentNumber} readOnly /></label></div>
              <div className="form-row"><label>Doctor<select value={selectedAppointmentDoctor} onChange={(event) => setNewAppointmentDoctor(event.target.value)}>{appointmentDoctors.map((doctor) => <option key={doctor.name} value={doctor.name}>{doctor.name}</option>)}</select></label><label>Date<input required type="date" value={newAppointmentDate} onChange={(event) => { const nextDate = event.target.value; const nextDoctors = getScheduledDoctors(nextDate.slice(8, 10)); setNewAppointmentDate(nextDate); setNewAppointmentDoctor(nextDoctors[0]?.name || '') }} /></label></div>
              <label>Time<input required type="time" value={newAppointmentTime} onChange={(event) => setNewAppointmentTime(event.target.value)} /></label>
              <button className="primary-button full-width" type="submit">Save appointment <ArrowUpRight size={15} /></button>
            </form>
          </div>
        )
      })()}
    </div>
  )
}

export default App
