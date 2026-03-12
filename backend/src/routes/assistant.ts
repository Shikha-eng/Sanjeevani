import express, { Response } from 'express';
import { protect } from '../middleware/auth';
import Appointment from '../models/Appointment';
import User from '../models/User';
import Report from '../models/Report';
import AiQuestion from '../models/AiQuestion';

const router = express.Router();

// ─── Topic Classifier ────────────────────────────────────────────────────────

const COMPLEX_PATTERNS = [
  /chest\s*pain/i, /heart\s*attack/i, /stroke/i, /seizure/i,
  /cancer/i, /tumor/i, /malignant/i, /biopsy/i,
  /surgery/i, /operation/i, /transplant/i,
  /arrhythmia/i, /tachycardia/i, /bradycardia/i,
  /insulin\s*dose/i, /medication\s*dosage/i, /drug\s*interaction/i,
  /overdose/i, /prescription/i,
  /kidney\s*failure/i, /renal\s*failure/i, /dialysis/i,
  /liver\s*failure/i, /cirrhosis/i, /hepatitis/i,
  /pneumonia/i, /tuberculosis/i, /appendicitis/i,
  /fracture/i, /broken\s*bone/i,
  /mental\s*health/i, /depression/i, /anxiety\s*disorder/i, /suicid/i,
  /covid/i, /infection\s*spread/i,
  /pregnancy\s*complication/i, /miscarriage/i,
  /what\s+medicine|which\s+medicine|what\s+drug|which\s+tablet/i,
  /should\s+i\s+take\s+.*(tablet|pill|medicine|drug|injection)/i,
  /diagnos/i, /treatment\s+for/i, /cure\s+for/i,
];

const SIMPLE_TOPICS: Record<string, RegExp[]> = {
  diet: [
    /what\s*(should|can)\s*i\s*eat/i, /diet/i, /food/i, /meal/i, /nutrition/i,
    /breakfast|lunch|dinner/i, /vegetable|fruit|protein|carb|fat/i,
    /rasmalai|sweet|sugar|chocolate|junk|fast\s*food|fried/i,
    /what\s*to\s*avoid/i, /healthy\s*eating/i, /drink\s*water/i,
  ],
  exercise: [
    /exercise/i, /workout/i, /walk/i, /yoga/i, /running/i,
    /physical\s*activity/i, /gym/i, /sport/i, /swim/i,
    /how\s+active/i, /fitness/i,
  ],
  weight: [
    /weight/i, /bmi/i, /obese/i, /overweight/i, /lose\s*weight/i,
    /gain\s*weight/i, /body\s*mass/i,
  ],
  lifestyle: [
    /sleep/i, /stress/i, /relax/i, /lifestyle/i, /smoking/i,
    /alcohol/i, /screen\s*time/i, /hydrat/i, /rest/i,
  ],
  reports: [
    /my\s*report/i, /test\s*result/i, /parameter/i, /blood\s*test/i,
    /lab\s*result/i, /what\s*does\s*my/i, /my\s*level/i,
  ],
  general: [
    /how\s*are\s*you/i, /hello|hi\b/i, /thank/i, /help/i,
    /tell\s*me\s*about/i,
  ],
};

function classifyQuestion(message: string): { topic: string; isComplex: boolean } {
  const isComplex = COMPLEX_PATTERNS.some((p) => p.test(message));
  if (isComplex) return { topic: 'complex', isComplex: true };

  for (const [topic, patterns] of Object.entries(SIMPLE_TOPICS)) {
    if (patterns.some((p) => p.test(message))) {
      return { topic, isComplex: false };
    }
  }
  return { topic: 'unknown', isComplex: false };
}

// ─── Detect needed specialist ─────────────────────────────────────────────────

function getSpecialization(message: string): string {
  if (/heart|cardiac|chest\s*pain|arrhythmia/i.test(message)) return 'Cardiologist';
  if (/diabetes|glucose|insulin|blood\s*sugar/i.test(message)) return 'Endocrinologist';
  if (/kidney|renal|creatinine/i.test(message)) return 'Nephrologist';
  if (/liver|hepatic|jaundice/i.test(message)) return 'Hepatologist';
  if (/bone|fracture|joint|arthritis/i.test(message)) return 'Orthopedic';
  if (/skin|dermat/i.test(message)) return 'Dermatologist';
  if (/mental|depression|anxiety|psych/i.test(message)) return 'Psychiatrist';
  if (/pregnan|gynec|menstrual/i.test(message)) return 'Gynecologist';
  if (/child|pediatr|infant/i.test(message)) return 'Pediatrician';
  if (/eye|vision|cataract/i.test(message)) return 'Ophthalmologist';
  if (/lung|breath|asthma|pneumonia/i.test(message)) return 'Pulmonologist';
  return 'General Physician';
}

async function findAssignedDoctor(patientId: any, specialization: string) {
  const appointmentDoctor = await Appointment.findOne({
    patientId,
    status: { $in: ['scheduled', 'completed'] },
  })
    .sort({ scheduledAt: -1 })
    .select('doctorId');

  if (appointmentDoctor?.doctorId) {
    const doctor = await User.findOne({
      _id: appointmentDoctor.doctorId,
      role: 'doctor',
      isActive: true,
    }).select('firstName lastName specialization consultationFee');

    if (doctor) {
      return {
        assignedDoctorId: doctor._id,
        doctors: [doctor],
      };
    }
  }

  const query: any = { role: 'doctor', isActive: true };
  if (specialization !== 'General Physician') {
    query.specialization = { $regex: new RegExp(specialization, 'i') };
  }

  const doctors = await User.find(query)
    .select('firstName lastName specialization consultationFee')
    .limit(5);

  return {
    assignedDoctorId: doctors.length > 0 ? doctors[0]._id : null,
    doctors,
  };
}

// ─── Response Generator ───────────────────────────────────────────────────────

function buildResponse(
  topic: string,
  message: string,
  profile: any,
  reports: any[]
): string {
  const name = profile.firstName || 'there';
  const hasDiabetes = profile.hasDiabetes;
  const hasBP = profile.hasBloodPressure;
  const bmi = profile.height && profile.weight
    ? parseFloat((profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1))
    : null;
  const isOverweight = bmi && bmi > 25;
  const isObese = bmi && bmi > 30;

  // Collect abnormal parameters from all reports
  const abnormalParams: string[] = [];
  reports.forEach((r) => {
    (r.parameters || []).forEach((p: any) => {
      if (p.status === 'high' || p.status === 'low') {
        abnormalParams.push(`${p.name} (${p.status.toUpperCase()}: ${p.value} ${p.unit})`);
      }
    });
  });

  const conditions: string[] = [];
  if (hasDiabetes) conditions.push('Type 2 Diabetes');
  if (hasBP) conditions.push('High Blood Pressure');

  const conditionNote = conditions.length > 0
    ? `Based on your profile, you have: **${conditions.join(', ')}**. `
    : '';
  const abnormalNote = abnormalParams.length > 0
    ? `\n\nYour recent reports also show: ${abnormalParams.slice(0, 3).join(', ')}.`
    : '';

  if (topic === 'diet') {
    let dietAdvice = `${conditionNote}Here are dietary recommendations tailored for you, ${name}:\n\n`;

    if (hasDiabetes && hasBP) {
      dietAdvice += `✅ **Recommended:**\n- Leafy greens (spinach, methi, palak)\n- Whole grains (oats, brown rice, roti)\n- Lean proteins (dal, eggs, grilled chicken)\n- Low-fat dairy\n- Berries, citrus fruits (in moderation)\n- Plenty of water (8–10 glasses/day)\n\n`;
      dietAdvice += `❌ **Avoid:**\n- High-sugar items (sweets, juices, cola)\n- High-salt/processed foods (chips, pickles, papad)\n- Saturated fats (fried food, ghee in excess)\n- Alcohol and smoking\n\n`;
      dietAdvice += `💡 Tip: Eat small portions every 3–4 hours. Never skip meals.`;
    } else if (hasDiabetes) {
      dietAdvice += `✅ **Recommended:**\n- Low-GI foods: oats, whole wheat, legumes, lentils\n- Non-starchy vegetables: broccoli, cucumber, tomato\n- Lean proteins: eggs, fish, tofu, paneer\n- Nuts: almonds, walnuts (small handful)\n\n`;
      dietAdvice += `❌ **Avoid:**\n- Sugary foods: sweets, rasmalai, jalebi, fruit juices\n- White rice, maida-based items, refined carbs\n- Soft drinks and alcohol\n\n`;
      dietAdvice += `💡 Tip: Monitor blood sugar 2 hours after eating new foods.`;
    } else if (hasBP) {
      dietAdvice += `✅ **Recommended (DASH Diet):**\n- Fresh fruits and vegetables\n- Low-sodium foods: home-cooked meals\n- Potassium-rich foods: banana, potato, spinach\n- Low-fat dairy, fish, nuts\n\n`;
      dietAdvice += `❌ **Avoid:**\n- High-sodium items: pickles, namkeen, fast food, processed cheese\n- Excess caffeine and alcohol\n\n`;
      dietAdvice += `💡 Tip: Aim for less than 1,500 mg of sodium per day.`;
    } else if (isObese) {
      dietAdvice += `✅ **Recommended (Weight Management):**\n- High-fiber foods: salads, dal, whole grains\n- Lean protein to stay full longer\n- Plenty of water before meals\n- 3 structured meals, avoid snacking\n\n`;
      dietAdvice += `❌ **Avoid:**\n- Fried and oily foods, sugar-laden snacks\n- Skipping meals (leads to overeating later)\n\n`;
      dietAdvice += `💡 Your BMI is ${bmi} — aim for gradual weight loss of 0.5 kg/week.`;
    } else {
      dietAdvice += `✅ **General Balanced Diet:**\n- Half your plate: vegetables and fruits\n- Quarter plate: whole grains\n- Quarter plate: protein (legumes, egg, chicken, fish)\n- Include healthy fats: olive oil, nuts, seeds\n\n`;
      dietAdvice += `💡 Stay hydrated (8 glasses of water/day) and minimize processed food.`;
    }

    // Check for specific food mention
    if (/rasmalai|sweet|mithai|jalebi|barfi/i.test(message)) {
      if (hasDiabetes) {
        dietAdvice = `${conditionNote}Based on your diabetes history, sweets like rasmalai or jalebi can **significantly spike your blood sugar**. It's best to avoid them or opt for sugar-free alternatives on special occasions — in very small amounts. Always check your sugar levels after consuming them.`;
      } else {
        dietAdvice = `You don't have diabetes, so occasional sweets are fine in moderation. Just maintain overall balance in your diet!`;
      }
    }

    return dietAdvice + abnormalNote;
  }

  if (topic === 'exercise') {
    let exerciseAdvice = `${conditionNote}Exercise recommendations for you, ${name}:\n\n`;
    if (hasDiabetes && hasBP) {
      exerciseAdvice += `✅ **Best for you:**\n- Brisk walking: 30 min/day, 5 days a week\n- Light yoga or stretching: 20 min/day\n- Swimming or cycling (low-impact)\n\n⚠️ Avoid intense exercise without warming up. Check blood sugar before and after exercise.\n\n💡 Always carry a glucose tablet or candy during exercise.`;
    } else if (hasDiabetes) {
      exerciseAdvice += `✅ Walking 30–45 min/day, 5 days a week can reduce blood sugar significantly.\n- Resistance training 2x/week (light weights)\n- Yoga for glucose regulation\n\n⚠️ Check blood sugar levels before exercising. Avoid exercise if sugar < 70 mg/dL.`;
    } else if (isObese) {
      exerciseAdvice += `✅ Start with low-impact exercises:\n- 20–30 min walking daily, gradually increase to 45 minutes\n- Swimming or cycling\n- Chair yoga or water aerobics\n\n💡 Even 10-minute walks 3x a day count! Your BMI is ${bmi}.`;
    } else {
      exerciseAdvice += `✅ Aim for 150 min of moderate exercise/week:\n- Brisk walking, jogging, cycling, swimming\n- Strength training 2–3x/week\n- Yoga/stretching for flexibility\n\n💡 Find an activity you enjoy — consistency is more important than intensity.`;
    }
    return exerciseAdvice + abnormalNote;
  }

  if (topic === 'weight') {
    if (!bmi) {
      return `${conditionNote}Please update your height and weight in your profile so I can give you accurate BMI-based advice.`;
    }
    let bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    let response = `Your BMI is **${bmi}** — Category: **${bmiCategory}**.\n\n`;
    if (bmi < 18.5) {
      response += `You're underweight. Focus on:\n- Calorie-dense nutritious foods: nuts, dairy, eggs, legumes\n- 5–6 small meals a day\n- Strength training to build muscle mass`;
    } else if (bmi < 25) {
      response += `Your weight is in the healthy range! 🎉 Maintain it with balanced meals and regular activity.`;
    } else {
      response += `A BMI of ${bmi} indicates excess weight. Recommendation:\n- Aim for a 300–500 calorie daily deficit\n- Include more fiber (keep you full)\n- 30 min walking daily\n- Reduce sugary drinks and fried foods`;
      if (hasDiabetes || hasBP) response += `\n\n⚠️ Weight loss of even 5–10% of your body weight can significantly improve diabetes and blood pressure control.`;
    }
    return response + abnormalNote;
  }

  if (topic === 'lifestyle') {
    let advice = `${conditionNote}Lifestyle tips personalized for you:\n\n`;
    if (/sleep/i.test(message)) {
      advice += `😴 **Sleep Advice:**\n- Aim for 7–9 hours of sleep per night\n- Maintain a consistent sleep schedule\n- Avoid screens 1 hour before bed\n- Keep your room cool and dark`;
      if (hasDiabetes) advice += `\n\n⚠️ Poor sleep increases insulin resistance. Prioritize rest!`;
    } else if (/stress/i.test(message)) {
      advice += `🧘 **Stress Management:**\n- Practice deep breathing (4-7-8 technique)\n- 10 min meditation daily\n- Regular gentle exercise (yoga, walking)\n- Talk to trusted friends or family`;
      if (hasBP) advice += `\n\n⚠️ Stress is a major trigger for high blood pressure. Relaxation is as important as medication.`;
    } else if (/smoking|alcohol/i.test(message)) {
      advice += `🚭 Both smoking and alcohol are strongly associated with worsening diabetes, hypertension, and heart disease risks.\n\n- Seek support from a healthcare provider for quitting\n- Nicotine patches or counseling can help with smoking\n- Reduce alcohol to <1 unit/day if unavoidable`;
    } else {
      advice += `- 💧 Hydrate: 8–10 glasses of water daily\n- 🚶‍♂️ Move: At least 30 min walking/day\n- 😴 Sleep: 7–9 hours consistently\n- 🥗 Eat: Balanced meals at regular times\n- 🧘 De-stress: Meditation or breathing exercises 10 min/day`;
    }
    return advice + abnormalNote;
  }

  if (topic === 'reports') {
    if (reports.length === 0) {
      return `You haven't uploaded any medical reports yet. Go to the **Reports** section to upload your lab reports — I'll then be able to give detailed insights from your results!`;
    }
    const latestReport = reports[0];
    let response = `Your most recent report: **${latestReport.reportName}** (${latestReport.reportType})\n\n`;
    if (latestReport.summary) response += `📋 Summary: ${latestReport.summary}\n\n`;
    if (abnormalParams.length > 0) {
      response += `⚠️ Parameters outside normal range:\n- ${abnormalParams.join('\n- ')}\n\n`;
      response += `These should be discussed with your doctor for proper guidance.`;
    } else {
      response += `✅ All checked parameters appear within normal limits. Keep up the healthy habits!`;
    }
    return response;
  }

  if (topic === 'general') {
    if (/hello|hi\b/i.test(message)) {
      return `Hello ${name}! 👋 I'm your Sanjeevani Health Assistant. I can help you with:\n\n- 🥗 Diet and nutrition advice\n- 🏃 Exercise recommendations\n- ⚖️ Weight and BMI insights\n- 💤 Lifestyle tips (sleep, stress, hydration)\n- 📊 Insights from your uploaded reports\n\nJust ask me anything about your health!`;
    }
    return `Hello ${name}! How can I help you today? I can provide diet advice, exercise tips, wellness guidance, and insights from your reports. For complex medical questions, I'll help you connect with the right specialist.`;
  }

  // Unknown topic
  return `I can help with diet, exercise, weight management, lifestyle tips, and interpreting your reports. Could you rephrase your question? For example: "What should I eat?" or "How much should I walk?"${conditionNote ? '\n\n' + conditionNote : ''}${abnormalNote}`;
}

// ─── GET /api/assistant/context ──────────────────────────────────────────────

router.get('/context', protect, async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      'firstName lastName bloodGroup height weight hasDiabetes hasBloodPressure'
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const reports = await Report.find({ patientId: userId })
      .sort({ uploadDate: -1 })
      .limit(5)
      .select('reportName reportType uploadDate summary keyFindings parameters');

    const bmi = user.height && user.weight
      ? parseFloat((user.weight / Math.pow(user.height / 100, 2)).toFixed(1))
      : null;

    const conditions: string[] = [];
    if (user.hasDiabetes) conditions.push('Diabetes');
    if (user.hasBloodPressure) conditions.push('High Blood Pressure');

    return res.json({
      success: true,
      data: {
        profile: {
          name: `${user.firstName} ${user.lastName}`,
          bloodGroup: user.bloodGroup,
          height: user.height,
          weight: user.weight,
          bmi,
          conditions,
        },
        reportsCount: reports.length,
      },
    });
  } catch (error) {
    console.error('Assistant context error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/questions', protect, async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Only patients can access questions' });
    }

    const questions = await AiQuestion.find({ patientId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'firstName lastName specialization')
      .select('question aiResponse doctorReply doctorReplyAt reviewedByDoctor specialization createdAt doctorId');

    return res.json({
      success: true,
      data: questions.map((item: any) => ({
        id: item._id,
        question: item.question,
        aiResponse: item.aiResponse,
        doctorReply: item.doctorReply || '',
        doctorReplyAt: item.doctorReplyAt || null,
        reviewedByDoctor: item.reviewedByDoctor,
        specialization: item.specialization || null,
        createdAt: item.createdAt,
        doctor: item.doctorId
          ? {
              name: `Dr. ${item.doctorId.firstName} ${item.doctorId.lastName}`,
              specialization: item.doctorId.specialization || item.specialization || 'Doctor',
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('Assistant questions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── POST /api/assistant/chat ─────────────────────────────────────────────────

router.post('/chat', protect, async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Fetch patient profile
    const user = await User.findById(userId).select(
      'firstName lastName bloodGroup height weight hasDiabetes hasBloodPressure'
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch recent reports
    const reports = await Report.find({ patientId: userId })
      .sort({ uploadDate: -1 })
      .limit(5)
      .select('reportName reportType uploadDate summary keyFindings parameters');

    // Classify question
    const { topic, isComplex } = classifyQuestion(message);

    let response = '';
    let specialization = '';

    if (isComplex) {
      specialization = getSpecialization(message);
      response = `This question requires professional medical evaluation. I strongly recommend consulting a **${specialization}** for accurate assessment and treatment guidance.\n\nClick the button below to find available doctors and book an appointment.`;
    } else {
      response = buildResponse(topic, message, user.toObject(), reports);
    }

    // Fetch available doctors in that specialization (if complex)
    let doctors: any[] = [];
    let assignedDoctorId: any = null;
    if (isComplex) {
      const assigned = await findAssignedDoctor(userId, specialization);
      doctors = assigned.doctors;
      assignedDoctorId = assigned.assignedDoctorId;

      const assignedDoctorText = doctors.length > 0
        ? `Your question has been forwarded to ${`Dr. ${doctors[0].firstName} ${doctors[0].lastName}`}. They can review it from their panel and send you a personal reply.`
        : 'Your question has been forwarded for doctor review. A doctor reply will appear here once reviewed.';

      response = `This question requires professional medical evaluation. I strongly recommend consulting a **${specialization}** for accurate assessment and treatment guidance.

${assignedDoctorText}`;

      await AiQuestion.create({
        patientId: userId,
        doctorId: assignedDoctorId,
        question: message,
        aiResponse: response,
        specialization,
        isComplex: true,
        reviewedByDoctor: false,
      });
    }

    return res.json({
      success: true,
      data: {
        response,
        isComplex,
        specialization: isComplex ? specialization : null,
        doctors: doctors.map((d) => ({
          id: d._id,
          name: `Dr. ${d.firstName} ${d.lastName}`,
          specialization: d.specialization || specialization,
          consultationFee: d.consultationFee || null,
        })),
      },
    });
  } catch (error) {
    console.error('Assistant chat error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
