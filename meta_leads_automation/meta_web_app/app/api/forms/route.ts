import { NextRequest, NextResponse } from "next/server";

// Recursive function to search for lead_gen_form_id in creative object
function findLeadGenFormId(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (obj.lead_gen_form_id) return obj.lead_gen_form_id.toString();
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object") {
      const found = findLeadGenFormId(val);
      if (found) return found;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const token = process.env.PAGE_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "PAGE_ACCESS_TOKEN is not configured in .env.local" },
      { status: 500 }
    );
  }

  const pageId = "112518168556497";
  const adAccountId = "act_232212386474212";

  try {
    // 1. Fetch ads from the Ad Account to inspect their delivery status and linked forms
    const adsUrl = `https://graph.facebook.com/v23.0/${adAccountId}/ads?fields=id,name,status,effective_status,creative{id,object_story_spec}&access_token=${token}&limit=150`;
    const adsRes = await fetch(adsUrl);
    if (!adsRes.ok) {
      const errData = await adsRes.json();
      return NextResponse.json(
        { error: errData.error?.message || "Failed to fetch ads from Meta API" },
        { status: adsRes.status }
      );
    }
    const adsData = await adsRes.json();
    const ads = adsData.data || [];

    // Filter ads where delivery is ACTIVE (effective_status is ACTIVE)
    const activeAds = ads.filter((ad: any) => ad.effective_status === "ACTIVE");

    // 2. Fetch all leadgen forms for the Page to get their detailed metadata
    const formsUrl = `https://graph.facebook.com/v23.0/${pageId}/leadgen_forms?access_token=${token}&limit=100`;
    const formsRes = await fetch(formsUrl);
    if (!formsRes.ok) {
      const errData = await formsRes.json();
      return NextResponse.json(
        { error: errData.error?.message || "Failed to fetch forms from Meta API" },
        { status: formsRes.status }
      );
    }
    const formsData = await formsRes.json();
    const allForms = formsData.data || [];

    // 3. Map active ads to their leadgen forms (showing by Ad Name as requested)
    const activeFormItems: any[] = [];
    activeAds.forEach((ad: any) => {
      const formId = findLeadGenFormId(ad.creative);
      if (formId) {
        const formDetails = allForms.find((f: any) => f.id === formId);
        // Only include if the form itself is active (optional, but ensures correctness)
        if (!formDetails || formDetails.status === "ACTIVE") {
          activeFormItems.push({
            id: formId,
            name: ad.name, // Display name is the Ad Name
            locale: formDetails?.locale || "en_US",
            adId: ad.id
          });
        }
      }
    });

    return NextResponse.json({ data: activeFormItems });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
