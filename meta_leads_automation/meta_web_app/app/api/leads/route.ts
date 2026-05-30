import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = process.env.PAGE_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "PAGE_ACCESS_TOKEN is not configured in .env.local" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const formId = searchParams.get("formId");

  if (!formId) {
    return NextResponse.json(
      { error: "Missing required parameter: formId" },
      { status: 400 }
    );
  }

  try {
    // We can fetch multiple pages if we want, or a high limit. Let's fetch with limit=500 first.
    let url = `https://graph.facebook.com/v23.0/${formId}/leads?fields=id,created_time,field_data,campaign_id,campaign_name,form_id&access_token=${token}&limit=250`;
    let allLeads: any[] = [];
    let hasNext = true;
    let pagesFetched = 0;

    // Fetch up to 4 pages (1000 leads maximum) to avoid timing out while providing a comprehensive set
    while (hasNext && pagesFetched < 4) {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        return NextResponse.json(
          { error: errData.error?.message || "Failed to fetch leads from Meta API" },
          { status: res.status }
        );
      }

      const data = await res.json();
      if (data.data) {
        allLeads = [...allLeads, ...data.data];
      }

      if (data.paging?.next && data.data && data.data.length > 0) {
        url = data.paging.next;
        pagesFetched++;
      } else {
        hasNext = false;
      }
    }

    return NextResponse.json({ data: allLeads });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
