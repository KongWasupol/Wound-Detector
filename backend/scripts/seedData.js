import dotenv from "dotenv";
import { connectDB } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Analysis } from "../src/models/Analysis.js";
import mongoose from "mongoose";

dotenv.config();

const exampleAnalyses = [
  {
    summary: "Superficial abrasion on left forearm with mild erythema. The wound appears clean with no signs of infection. Minimal exudate present. Edges are well-defined and healing appears to be progressing normally.",
    severityScore: 25,
    recommendations: [
      "Keep the wound clean and dry",
      "Apply antibiotic ointment twice daily",
      "Monitor for signs of infection (increased redness, swelling, or pus)",
      "Change dressing daily or when soiled"
    ],
    insights: [
      {
        label: "Wound Depth",
        detail: "Superficial abrasion affecting only the epidermal layer. No underlying tissue damage observed."
      },
      {
        label: "Healing Progress",
        detail: "Early granulation tissue formation visible. Wound bed appears healthy with good vascularization."
      },
      {
        label: "Infection Risk",
        detail: "Low risk. No purulent discharge, excessive redness, or foul odor detected."
      },
      {
        label: "Surrounding Tissue",
        detail: "Mild erythema (redness) around the wound edges, which is normal in the inflammatory phase of healing."
      }
    ],
    notes: "Patient reported minor fall. Wound occurred 2 days ago.",
    model: "gpt-4o"
  },
  {
    summary: "Moderate-sized laceration on right knee with visible subcutaneous tissue. Wound edges are slightly irregular with moderate bleeding. Some debris present in the wound bed. Surrounding area shows moderate inflammation.",
    severityScore: 58,
    recommendations: [
      "Irrigate wound thoroughly with sterile saline",
      "Consider suturing if wound edges are gaping",
      "Administer tetanus prophylaxis if indicated",
      "Prescribe oral antibiotics as prophylaxis",
      "Schedule follow-up in 48-72 hours"
    ],
    insights: [
      {
        label: "Wound Classification",
        detail: "Partial-thickness laceration extending into the dermal layer. Subcutaneous fat visible in some areas."
      },
      {
        label: "Edge Assessment",
        detail: "Irregular wound edges suggest a traumatic mechanism. May require debridement of non-viable tissue."
      },
      {
        label: "Hemostasis",
        detail: "Moderate active bleeding observed. May require pressure dressing or suturing to achieve hemostasis."
      },
      {
        label: "Contamination",
        detail: "Visible debris in wound bed increases infection risk. Thorough irrigation is essential."
      }
    ],
    notes: "Injury occurred during sports activity. Patient is otherwise healthy.",
    model: "gpt-4o"
  },
  {
    summary: "Chronic ulcer on left lower leg with signs of infection. Wound bed shows yellow slough and minimal granulation tissue. Periwound skin is macerated and shows signs of venous insufficiency. Moderate exudate present.",
    severityScore: 72,
    recommendations: [
      "Initiate aggressive wound debridement",
      "Start broad-spectrum antibiotics",
      "Apply appropriate wound dressing (consider alginate or foam)",
      "Implement compression therapy for venous insufficiency",
      "Refer to wound care specialist",
      "Monitor for signs of cellulitis or osteomyelitis"
    ],
    insights: [
      {
        label: "Wound Age",
        detail: "Chronic wound with characteristics suggesting it has been present for several weeks. Poor healing progression observed."
      },
      {
        label: "Infection Indicators",
        detail: "Yellow slough, increased exudate, and periwound erythema suggest local infection. Culture recommended."
      },
      {
        label: "Tissue Viability",
        detail: "Minimal granulation tissue indicates poor healing potential. Underlying vascular issues may be contributing."
      },
      {
        label: "Etiology",
        detail: "Venous insufficiency likely contributing to chronicity. Compression therapy and elevation are critical."
      }
    ],
    notes: "Patient has history of diabetes and venous insufficiency. Wound has been present for 6 weeks.",
    model: "gpt-4o-mini"
  },
  {
    summary: "Superficial burn on right hand with intact blisters. First-degree to partial second-degree burn. Surrounding skin is erythematous but intact. No signs of infection. Patient reports pain level 6/10.",
    severityScore: 35,
    recommendations: [
      "Do not rupture blisters - they provide natural protection",
      "Apply cool (not cold) compresses for pain relief",
      "Use topical silver sulfadiazine cream",
      "Keep area elevated to reduce swelling",
      "Monitor for signs of infection",
      "Consider pain management"
    ],
    insights: [
      {
        label: "Burn Depth",
        detail: "Mixed first and second-degree burns. Blisters indicate partial-thickness injury affecting epidermis and upper dermis."
      },
      {
        label: "Blister Management",
        detail: "Intact blisters should be left alone as they provide a sterile environment and reduce infection risk."
      },
      {
        label: "Pain Assessment",
        detail: "Moderate pain is expected with this burn depth. Pain management should be addressed."
      },
      {
        label: "Healing Prognosis",
        detail: "Good prognosis with proper care. Expected healing time 2-3 weeks with minimal scarring."
      }
    ],
    notes: "Thermal burn from hot water. Occurred 4 hours ago.",
    model: "gpt-4-turbo"
  },
  {
    summary: "Animal wound on dog's hind leg - deep laceration with muscle exposure. Active bleeding controlled. Wound edges are clean but gaping. Surrounding fur is matted with blood. No signs of systemic distress.",
    severityScore: 65,
    recommendations: [
      "Immediate veterinary attention required",
      "Wound requires surgical closure under anesthesia",
      "Administer pain medication",
      "Start antibiotic therapy",
      "Keep animal from licking the wound (use Elizabethan collar)",
      "Monitor for signs of shock or infection"
    ],
    insights: [
      {
        label: "Wound Severity",
        detail: "Deep laceration extending to muscle layer. Surgical intervention likely necessary for proper closure."
      },
      {
        label: "Hemostasis",
        detail: "Bleeding appears controlled, but wound requires professional assessment for underlying damage."
      },
      {
        label: "Contamination Risk",
        detail: "High risk of contamination given the depth and location. Prompt veterinary care is essential."
      },
      {
        label: "Animal Behavior",
        detail: "Animal may attempt to lick or chew the wound, which can introduce infection. Protective measures needed."
      }
    ],
    notes: "Dog injured during altercation with another animal. Owner brought in immediately.",
    model: "gpt-4o"
  },
  {
    summary: "Post-surgical incision site showing excellent healing. Minimal erythema, no drainage, sutures intact. Wound edges are well-approximated. No signs of infection or dehiscence.",
    severityScore: 15,
    recommendations: [
      "Continue current wound care regimen",
      "Keep incision site dry",
      "Monitor for any changes",
      "Sutures can be removed in 7-10 days as planned",
      "Avoid strenuous activity that might stress the incision"
    ],
    insights: [
      {
        label: "Healing Status",
        detail: "Excellent healing progression. Wound is in the proliferative phase with good tissue repair."
      },
      {
        label: "Infection Assessment",
        detail: "No signs of infection. Incision site is clean, dry, and shows normal healing characteristics."
      },
      {
        label: "Suture Integrity",
        detail: "Sutures are intact and providing adequate wound support. No tension on the incision observed."
      },
      {
        label: "Prognosis",
        detail: "Excellent prognosis. Healing is progressing as expected with no complications."
      }
    ],
    notes: "Post-operative check 5 days after appendectomy. Patient recovering well.",
    model: "gpt-4o"
  },
  {
    summary: "Pressure ulcer on sacral area - Stage 2 ulcer with partial thickness skin loss. Wound bed is pink and moist. Periwound skin shows early signs of maceration. No signs of infection.",
    severityScore: 45,
    recommendations: [
      "Implement pressure relief measures immediately",
      "Use appropriate pressure-relieving support surface",
      "Apply moisture-barrier dressing",
      "Reposition patient every 2 hours",
      "Monitor nutritional status",
      "Assess for underlying risk factors"
    ],
    insights: [
      {
        label: "Ulcer Stage",
        detail: "Stage 2 pressure ulcer with partial-thickness loss involving epidermis and possibly upper dermis."
      },
      {
        label: "Wound Bed",
        detail: "Pink, moist wound bed indicates viable tissue. Good healing potential if pressure is relieved."
      },
      {
        label: "Risk Factors",
        detail: "Location and appearance suggest prolonged pressure. Comprehensive risk assessment needed."
      },
      {
        label: "Prevention",
        detail: "Critical to address underlying cause (pressure, immobility) to prevent progression to deeper stages."
      }
    ],
    notes: "Patient is bedridden. Ulcer developed over past week. Nutritional assessment pending.",
    model: "gpt-4o-mini"
  },
  {
    summary: "Animal health condition - cat with skin lesion on back. Area shows hair loss, redness, and mild scaling. No open wounds but skin appears irritated. Possible allergic reaction or dermatological condition.",
    severityScore: 30,
    recommendations: [
      "Veterinary consultation recommended",
      "Prevent animal from scratching the area",
      "Consider hypoallergenic diet trial",
      "Monitor for progression or additional lesions",
      "Keep area clean and dry",
      "May require topical or systemic treatment"
    ],
    insights: [
      {
        label: "Clinical Presentation",
        detail: "Alopecia (hair loss) with erythema and scaling suggests possible allergic dermatitis or parasitic infestation."
      },
      {
        label: "Differential Diagnosis",
        detail: "Consider flea allergy, food allergy, contact dermatitis, or fungal infection. Diagnostic testing may be needed."
      },
      {
        label: "Severity",
        detail: "Mild to moderate condition. Early intervention can prevent progression and secondary infections."
      },
      {
        label: "Management",
        detail: "Requires proper diagnosis before treatment. Symptomatic care can help while awaiting veterinary evaluation."
      }
    ],
    notes: "Owner noticed lesion 3 days ago. Cat has been scratching more than usual.",
    model: "gpt-4o"
  }
];

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Connect to database
    await connectDB();
    
    // Find or create a test user
    let testUser = await User.findOne({ email: "demo@wounddetector.com" });
    
    if (!testUser) {
      console.log("📝 Creating test user...");
      testUser = await User.create({
        name: "Demo User",
        email: "demo@wounddetector.com",
        password: "demo123456", // Will be hashed automatically
        role: "clinician",
        emailVerified: true,
      });
      console.log("✅ Test user created:", testUser.email);
    } else {
      console.log("✅ Using existing test user:", testUser.email);
    }
    
    // Clear existing analyses for this user (optional - comment out if you want to keep existing data)
    const deletedCount = await Analysis.deleteMany({ user: testUser._id });
    console.log(`🗑️  Cleared ${deletedCount.deletedCount} existing analyses`);
    
    // Create analyses
    console.log("📊 Creating example analyses...");
    const createdAnalyses = [];
    
    for (let i = 0; i < exampleAnalyses.length; i++) {
      const example = exampleAnalyses[i];
      
      // Create a dummy image path (in real scenario, these would be actual uploaded images)
      const imagePath = `uploads/wound-example-${Date.now()}-${i}.jpg`;
      const imageOriginalName = `example-wound-${i + 1}.jpg`;
      
      // For some analyses, link them as follow-ups (symptom tracking)
      let symptomId = undefined;
      if (i === 1) {
        // Link analysis 1 as a follow-up to analysis 0
        symptomId = createdAnalyses[0]?._id?.toString();
      } else if (i === 2) {
        // Link analysis 2 as a follow-up to analysis 0 (same symptom)
        symptomId = createdAnalyses[0]?._id?.toString();
      } else if (i === 5) {
        // Link analysis 5 as a follow-up to analysis 4
        symptomId = createdAnalyses[4]?._id?.toString();
      }
      
      const analysis = await Analysis.create({
        user: testUser._id,
        provider: "openai",
        model: example.model || "gpt-4o",
        imagePath,
        imageOriginalName,
        notes: example.notes,
        summary: example.summary,
        severityScore: example.severityScore,
        recommendations: example.recommendations,
        insights: example.insights,
        symptomId: symptomId,
        createdAt: new Date(Date.now() - (exampleAnalyses.length - i) * 24 * 60 * 60 * 1000), // Stagger dates
      });
      
      createdAnalyses.push(analysis);
      console.log(`  ✅ Created analysis ${i + 1}/${exampleAnalyses.length}: ${example.summary.substring(0, 50)}...`);
    }
    
    console.log("\n🎉 Seeding completed successfully!");
    console.log(`📈 Created ${createdAnalyses.length} example analyses`);
    console.log(`👤 Test user: ${testUser.email} (password: demo123456)`);
    console.log("\n💡 You can now login with:");
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: demo123456`);
    
    // Close connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed script
seedDatabase();

