#!/usr/bin/env node
/**
 * Test script to trace the complete defense demo flow
 */

const API_BASE = 'http://localhost:3000/api/v1';
const TOKEN = 'carebridge-defense-demo';
const HOSPITAL_B_API_BASE = 'http://localhost:4002/api/v1';
const HOSPITAL_TOKEN = 'mock-hospital-token';

let dataRequestId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = new URL(`${API_BASE}${path}`, 'http://localhost');
  url.searchParams.set('token', TOKEN);
  
  const response = await fetch(url.toString(), options);
  const data = await response.json();
  
  if (!response.ok) {
    console.error(`❌ Error (${response.status}):`, data);
    throw new Error(`API Error: ${data.message || response.statusText}`);
  }

  return data;
}

async function resolvePatient() {
  console.log('\n1️⃣ Resolving patient DA-01741-4506...');
  const result = await makeRequest('GET', '/defense/resolve-patient?patientRef=DA-01741-4506');

  console.log(`   ✅ Found: ${result.patient.fullName}`);
  console.log(`   Hospital ID: ${result.patient.externalId}`);
  console.log(`   System ID: ${result.patient.id}`);
  return result;
}

async function startDemoFlow(resolution) {
  console.log('\n2️⃣ Starting demo flow...');
  const result = await makeRequest('POST', '/defense/start', {
    patientRef: 'DA-01741-4506',
    autoApprove: false,
    targetHospitalId: resolution.hospitals.find(h => h.name.includes('Hospital A')).id,
  });

  dataRequestId = result.request.id;
  console.log(`   ✅ Data request created: ${dataRequestId}`);
  return result;
}

async function approveConsent() {
  console.log('\n3️⃣ Approving consent...');
  const result = await makeRequest('POST', '/defense/approve-consent', {
    dataRequestId,
  });

  console.log(`   ✅ Consent approved`);
  return result;
}

async function checkRequestStatus() {
  console.log('\n4️⃣ Checking delivered data in Hospital B...');

  const response = await fetch(`${HOSPITAL_B_API_BASE}/data-delivery`, {
    headers: {
      Authorization: `Bearer ${HOSPITAL_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Hospital B delivery check failed (${response.status})`);
  }

  const payload = await response.json();
  const deliveries = Array.isArray(payload.deliveries) ? payload.deliveries : [];

  if (deliveries.length === 0) {
    throw new Error('No deliveries found in Hospital B');
  }

  const latest = deliveries[deliveries.length - 1];
  const medicalData = latest?.data || {};

  console.log(`   Deliveries found: ${deliveries.length}`);
  console.log(`   Latest delivery id: ${latest?.id || 'n/a'}`);
  console.log(`   patientId: ${latest?.patientId || '❌'}`);
  console.log(`   sourceHospital: ${latest?.sourceHospital || '❌'}`);
  console.log(`\n   Medical data types:`);
  console.log(`   - blood_tests: ${Array.isArray(medicalData.blood_tests) ? `✅ (${medicalData.blood_tests.length} items)` : '❌'}`);
  console.log(`   - blood_group: ${Array.isArray(medicalData.blood_group) ? `✅ (${medicalData.blood_group.length} items)` : '❌'}`);
  console.log(`   - health_history: ${Array.isArray(medicalData.health_history) ? `✅ (${medicalData.health_history.length} items)` : '❌'}`);

  return latest;
}

async function main() {
  try {
    console.log('🚀 Starting defense demo flow test...\n');
    
    const resolution = await resolvePatient();
    console.log('\n   ⚠️  Note: externalId will be updated during startDemoFlow\n');
    
    await sleep(500);
    
    await startDemoFlow(resolution);
    await sleep(1000);
    
    // Re-resolve to see updated externalId
    const resolveAgain = await resolvePatient();
    console.log('\n   Updated Hospital ID: ' + resolveAgain.patient.externalId);
    
    await approveConsent();
    await sleep(3000); // Wait for data fetch
    
    await checkRequestStatus();
    
    console.log('\n✨ Test complete!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
