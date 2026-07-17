// GET /api/v1/organizations
import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { authenticate } from "../_auth";

export async function GET(request: Request) {
  const auth = await authenticate(request, "organizations:read");
  if (!auth.ok) return auth.response;

  const [org, members, invitations] = await Promise.all([
    forgeFlowService.organizationRepository.getOrganization(),
    forgeFlowService.organizationRepository.getMembers(),
    forgeFlowService.organizationRepository.getInvitations(),
  ]);

  return NextResponse.json({
    success: true,
    data: { organization: org, memberCount: members.length, members, invitations },
    meta: { version: "v1" },
  });
}

export const dynamic = "force-dynamic";
