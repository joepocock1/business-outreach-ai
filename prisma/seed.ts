import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test user
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      passwordHash,
      name: "Joe Pocock",
      businessName: "Pocock Web Development",
      portfolioUrl: "https://joepocock.com",
      phone: "+44 7700 900000",
    },
  });

  console.log("Created test user:", user.email);

  // Create sample Cardiff businesses
  const leads = [
    {
      businessName: "The Pot Bistro",
      contactName: "Sarah Williams",
      email: "sarah@thepotbistro.co.uk",
      phone: "029 2034 1234",
      address: "45 High Street, Cardiff CF10 1PT",
      industry: "Restaurant",
      tags: ["local", "food-drink"],
      source: "Manual",
    },
    {
      businessName: "Cardiff Plumbing Solutions",
      contactName: "Mike Davies",
      email: "mike@cardiffplumbing.co.uk",
      phone: "029 2045 5678",
      address: "Unit 3, Canton Industrial Estate, Cardiff CF5 1NP",
      industry: "Contractor",
      tags: ["trades", "emergency-services"],
      source: "Google Maps",
    },
    {
      businessName: "Penarth Pet Supplies",
      contactName: "Emma Roberts",
      email: "emma@penarthpets.co.uk",
      phone: "029 2070 9012",
      address: "12 Windsor Road, Penarth CF64 1JH",
      industry: "Retail",
      tags: ["local", "pets"],
      source: "Manual",
    },
    {
      businessName: "Bay Fitness Studio",
      contactName: "James Thompson",
      email: "james@bayfitness.co.uk",
      phone: "029 2046 3456",
      address: "Bay Studios, Cardiff Bay CF10 5AL",
      industry: "Health & Fitness",
      tags: ["fitness", "local"],
      source: "Google Maps",
    },
    {
      businessName: "Roath Locks Hair Salon",
      contactName: "Lisa Morgan",
      email: "lisa@roathlocks.co.uk",
      phone: "029 2048 7890",
      address: "78 Albany Road, Roath CF24 3RS",
      industry: "Beauty & Personal Care",
      tags: ["beauty", "local"],
      source: "Manual",
    },
    {
      businessName: "Canton Carpentry",
      contactName: "David Evans",
      email: "david@cantoncarpentry.co.uk",
      phone: "029 2039 2345",
      address: "23 Cowbridge Road East, Canton CF5 1BE",
      industry: "Contractor",
      tags: ["trades", "woodwork"],
      source: "Google Maps",
    },
    {
      businessName: "Cathays Kebab House",
      contactName: "Ali Hassan",
      email: "ali@cathayskebab.co.uk",
      phone: "029 2037 6789",
      address: "156 Crwys Road, Cathays CF24 4NR",
      industry: "Restaurant",
      tags: ["food-drink", "takeaway"],
      source: "Manual",
    },
    {
      businessName: "Llandaff Landscaping",
      contactName: "Tom Jenkins",
      email: "tom@llandafflandscaping.co.uk",
      phone: "029 2056 1234",
      address: "Llandaff, Cardiff CF5 2YE",
      industry: "Contractor",
      tags: ["trades", "outdoor"],
      source: "Google Maps",
    },
    {
      businessName: "The Coffee Collective",
      contactName: "Hannah Price",
      email: "hannah@coffeecollective.co.uk",
      phone: "029 2022 5678",
      address: "34 St Mary Street, Cardiff CF10 1AD",
      industry: "Cafe",
      tags: ["food-drink", "coffee"],
      source: "Manual",
    },
    {
      businessName: "Whitchurch Wills & Probate",
      contactName: "Richard Hughes",
      email: "richard@whitchurchwills.co.uk",
      phone: "029 2062 9012",
      address: "56 Merthyr Road, Whitchurch CF14 1DL",
      industry: "Legal Services",
      tags: ["professional", "legal"],
      source: "Manual",
    },
    {
      businessName: "Riverside Auto Repairs",
      contactName: "Steve Collins",
      email: "steve@riversideauto.co.uk",
      phone: "029 2038 3456",
      address: "Riverside Industrial Park, Cardiff CF11 6RX",
      industry: "Automotive",
      tags: ["trades", "automotive"],
      source: "Google Maps",
    },
    {
      businessName: "Grangetown Grocers",
      contactName: "Priya Patel",
      email: "priya@grangetowngrocers.co.uk",
      phone: "029 2023 7890",
      address: "89 Clare Road, Grangetown CF11 6QP",
      industry: "Retail",
      tags: ["local", "groceries"],
      source: "Manual",
    },
    {
      businessName: "Heath Heating Services",
      contactName: "Paul Williams",
      email: "paul@heathheating.co.uk",
      phone: "029 2075 2345",
      address: "Heath, Cardiff CF14 4BP",
      industry: "Contractor",
      tags: ["trades", "heating"],
      source: "Google Maps",
    },
    {
      businessName: "Splott Sounds Music Shop",
      contactName: "Chris Taylor",
      email: "chris@splottsounds.co.uk",
      phone: "029 2046 6789",
      address: "42 Splott Road, Splott CF24 2BU",
      industry: "Retail",
      tags: ["local", "music"],
      source: "Manual",
    },
    {
      businessName: "Cyncoed Cleaning Co",
      contactName: "Maria Santos",
      email: "maria@cyncoedcleaning.co.uk",
      phone: "029 2076 1234",
      address: "Cyncoed, Cardiff CF23 6SH",
      industry: "Cleaning Services",
      tags: ["services", "cleaning"],
      source: "Google Maps",
    },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: lead.email,
        },
      },
      update: {},
      create: {
        ...lead,
        userId: user.id,
        status: "New",
      },
    });
  }

  console.log(`Created ${leads.length} sample leads`);

  // Create sample templates
  const templates = [
    {
      name: "General Local Business Outreach",
      description:
        "A versatile template for reaching out to any local business without a website",
      masterSubject: "Quick question about {{businessName}}'s online presence",
      masterBody: `Hi {{contactName}},

I was looking for {{businessName}} online and noticed you don't have a website yet. In today's digital age, that's actually a big opportunity waiting to happen.

I'm {{yourName}}, a local web developer based here in Cardiff. I help small businesses like yours get found online and attract more customers.

A simple, professional website could help you:
- Show up when locals search for your services
- Display your work, menu, or services 24/7
- Let customers book or contact you easily

I'd love to show you some examples of what I've done for other Cardiff businesses. Would you be open to a quick 15-minute chat?

Best regards,
{{yourName}}
{{portfolioUrl}}`,
      targetIndustry: null,
      tone: "professional",
    },
    {
      name: "Restaurant & Cafe Outreach",
      description:
        "Specifically crafted for restaurants, cafes, and food businesses",
      masterSubject: "Helping {{businessName}} get more bookings",
      masterBody: `Hi {{contactName}},

I recently discovered {{businessName}} and was impressed by what I saw! However, I noticed you don't have a website, which means you might be missing out on customers who search online before deciding where to eat.

I'm {{yourName}}, a Cardiff-based web developer who specializes in helping restaurants and cafes build their online presence.

A website for {{businessName}} could include:
- Your menu with beautiful food photography
- Online reservations or ordering
- Customer reviews and location map
- Special offers and events

I've helped several Cardiff eateries increase their bookings. Would you be interested in seeing some examples?

Let me know if you'd like to chat - even just 10 minutes could open up some great ideas.

Cheers,
{{yourName}}
{{portfolioUrl}}`,
      targetIndustry: "Restaurant",
      tone: "friendly",
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: {
        id: template.name.toLowerCase().replace(/\s+/g, "-"),
      },
      update: {},
      create: {
        ...template,
        userId: user.id,
      },
    });
  }

  console.log(`Created ${templates.length} sample templates`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
