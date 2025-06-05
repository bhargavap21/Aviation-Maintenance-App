#!/usr/bin/env node

/**
 * Test Script for Email Notification System
 * Demonstrates the complete workflow from AI recommendation to email notifications
 */

const baseUrl = 'http://localhost:3000';

async function fetch(url, options = {}) {
  const { default: fetch } = await import('node-fetch');
  return fetch(url, options);
}

async function testEmailNotificationWorkflow() {
  console.log('🚀 TESTING COMPLETE EMAIL NOTIFICATION WORKFLOW');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Generate AI recommendations
    console.log('\n📊 Step 1: Generating AI recommendations...');
    const optimizeResponse = await fetch(`${baseUrl}/api/maintenance-schedule?action=optimize`);
    const optimizeData = await optimizeResponse.json();
    
    if (!optimizeData.success) {
      throw new Error('Failed to generate recommendations');
    }
    
    console.log(`✅ Generated ${optimizeData.data.aiRecommendations.length} AI recommendations`);
    
    // Step 2: Get the first recommendation
    console.log('\n🎯 Step 2: Selecting recommendation to approve...');
    const recommendationsResponse = await fetch(`${baseUrl}/api/maintenance-schedule?action=ai-recommendations`);
    const recommendationsData = await recommendationsResponse.json();
    
    const recommendation = recommendationsData.data.recommendations[0];
    console.log(`📋 Selected: ${recommendation.tailNumber} - ${recommendation.maintenanceType}`);
    console.log(`💰 Estimated Cost: $${recommendation.estimatedCost.toLocaleString()}`);
    console.log(`⏰ Recommended Date: ${new Date(recommendation.recommendedDate).toLocaleDateString()}`);
    
    // Step 3: Approve recommendation and trigger email notifications
    console.log('\n✅ Step 3: Approving recommendation and sending email notifications...');
    const approvalResponse = await fetch(`${baseUrl}/api/maintenance-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve-recommendation',
        recommendationId: recommendation.id,
        approvedBy: 'Test Flight Operations Manager',
        approvalNotes: 'Approved via automated testing system - all personnel notified'
      })
    });
    
    const approvalData = await approvalResponse.json();
    
    if (!approvalData.success) {
      throw new Error(`Approval failed: ${approvalData.message}`);
    }
    
    // Step 4: Display email notification results
    console.log('\n📧 Step 4: Email Notification Results');
    console.log('-'.repeat(40));
    
    const emailInfo = approvalData.data.emailNotifications;
    console.log(`📤 Total emails sent: ${emailInfo.sent}`);
    console.log(`👥 Recipients notified:`);
    
    emailInfo.recipients.forEach(recipient => {
      console.log(`   • ${recipient.name} (${recipient.role})`);
      console.log(`     📧 ${recipient.email}`);
    });
    
    if (emailInfo.failures.length > 0) {
      console.log(`\n❌ Failed notifications: ${emailInfo.failures.length}`);
      emailInfo.failures.forEach(failure => {
        console.log(`   • ${failure}`);
      });
    }
    
    // Step 5: Display automated actions
    console.log('\n🤖 Step 5: Automated Actions Completed');
    console.log('-'.repeat(40));
    approvalData.data.automatedActions.forEach(action => {
      console.log(`✓ ${action}`);
    });
    
    // Step 6: Check active workflows
    console.log('\n🔄 Step 6: Active Workflow Status');
    console.log('-'.repeat(40));
    const workflowsResponse = await fetch(`${baseUrl}/api/maintenance-schedule?action=active-workflows`);
    const workflowsData = await workflowsResponse.json();
    
    console.log(`📊 Total active workflows: ${workflowsData.data.totalActive}`);
    console.log('📈 Status breakdown:');
    Object.entries(workflowsData.data.byStatus).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`   • ${status.replace('_', ' ')}: ${count}`);
      }
    });
    
    if (workflowsData.data.workflows.length > 0) {
      const workflow = workflowsData.data.workflows[0];
      console.log(`\n🛩️  Latest Workflow: ${workflow.tailNumber} - ${workflow.maintenanceType}`);
      console.log(`📍 Location: ${workflow.resources.hangar}`);
      console.log(`👷 Team: ${workflow.assignments.mechanic}, ${workflow.assignments.supervisor}`);
      console.log(`📊 Progress: ${workflow.progress.tasksCompleted}/${workflow.progress.totalTasks} tasks`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 EMAIL NOTIFICATION SYSTEM TEST COMPLETED SUCCESSFULLY!');
    console.log(`📧 ${emailInfo.sent} team members have been automatically notified`);
    console.log('🔄 Active workflow is now tracking maintenance progress');
    console.log('✈️  Aircraft maintenance coordination is fully automated');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testEmailNotificationWorkflow(); 