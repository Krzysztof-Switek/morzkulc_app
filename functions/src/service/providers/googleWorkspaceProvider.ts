import { google } from "googleapis";
import type { admin_directory_v1, gmail_v1, groupssettings_v1 } from "googleapis";
import { getDelegatedAuth } from "./googleAuth";

export const WORKSPACE_SCOPES = {
  GROUP_MEMBER: "https://www.googleapis.com/auth/admin.directory.group.member",
  GROUP: "https://www.googleapis.com/auth/admin.directory.group",
  GROUPS_SETTINGS: "https://www.googleapis.com/auth/apps.groups.settings",
  GMAIL_SEND: "https://www.googleapis.com/auth/gmail.send",
} as const;

function normalizeEmail(v: string): string {
  return String(v || "").trim().toLowerCase();
}

function assertLooksLikeEmail(label: string, v: string) {
  if (!v || !v.includes("@") || v.startsWith("@") || v.endsWith("@")) {
    throw new Error(`Invalid ${label}: "${v}"`);
  }
}

export class GoogleWorkspaceProvider {
  constructor(private delegatedUserEmail: string) {}

  private async getDirectoryClient(): Promise<admin_directory_v1.Admin> {
    const auth = await getDelegatedAuth(
      [WORKSPACE_SCOPES.GROUP_MEMBER, WORKSPACE_SCOPES.GROUP],
      this.delegatedUserEmail
    );
    return (google as any).admin({ version: "directory_v1", auth }) as admin_directory_v1.Admin;
  }

  private async getGroupsSettingsClient(): Promise<groupssettings_v1.Groupssettings> {
    const auth = await getDelegatedAuth([WORKSPACE_SCOPES.GROUPS_SETTINGS], this.delegatedUserEmail);
    return (google as any).groupssettings({ version: "v1", auth }) as groupssettings_v1.Groupssettings;
  }

  private async getGmailClient(): Promise<gmail_v1.Gmail> {
    const auth = await getDelegatedAuth([WORKSPACE_SCOPES.GMAIL_SEND], this.delegatedUserEmail);
    return (google as any).gmail({ version: "v1", auth }) as gmail_v1.Gmail;
  }

  async isMemberOfGroup(groupEmail: string, memberEmail: string): Promise<boolean> {
    const directory = await this.getDirectoryClient();

    const g = normalizeEmail(groupEmail);
    const m = normalizeEmail(memberEmail);
    assertLooksLikeEmail("groupEmail", g);
    assertLooksLikeEmail("memberEmail", m);

    try {
      await directory.members.get({ groupKey: g, memberKey: m });
      return true;
    } catch (e: any) {
      const code = e?.code || e?.response?.status;
      if (code === 404) return false;
      const msg = e?.message || String(e);
      throw new Error(`Directory.members.get failed for group="${g}" member="${m}": ${msg}`);
    }
  }

  async removeMemberFromGroup(
    groupEmail: string,
    memberEmail: string
  ): Promise<"removed" | "not_member"> {
    const directory = await this.getDirectoryClient();

    const g = normalizeEmail(groupEmail);
    const m = normalizeEmail(memberEmail);
    assertLooksLikeEmail("groupEmail", g);
    assertLooksLikeEmail("memberEmail", m);

    try {
      await directory.members.delete({groupKey: g, memberKey: m});
      return "removed";
    } catch (e: any) {
      const code = e?.code || e?.response?.status;
      if (code === 404) return "not_member";
      const msg = e?.message || String(e);
      throw new Error(`Directory.members.delete failed for group="${g}" member="${m}": ${msg}`);
    }
  }

  async addMemberToGroup(
    groupEmail: string,
    memberEmail: string,
    role: "MEMBER" | "MANAGER" | "OWNER"
  ): Promise<"added" | "already"> {
    const directory = await this.getDirectoryClient();

    const g = normalizeEmail(groupEmail);
    const m = normalizeEmail(memberEmail);
    assertLooksLikeEmail("groupEmail", g);
    assertLooksLikeEmail("memberEmail", m);

    const exists = await this.isMemberOfGroup(g, m);
    if (exists) {
      try {
        const res = await directory.members.get({ groupKey: g, memberKey: m });
        const currentRole = (res.data.role || "MEMBER") as any;
        if (currentRole !== role) {
          await directory.members.update({
            groupKey: g,
            memberKey: m,
            requestBody: { role },
          });
        }
      } catch {
        // best-effort
      }
      return "already";
    }

    try {
      await directory.members.insert({
        groupKey: g,
        requestBody: { email: m, role },
      });
    } catch (e: any) {
      const msg = e?.message || String(e);
      throw new Error(`Directory.members.insert failed for group="${g}" member="${m}" role="${role}": ${msg}`);
    }

    return "added";
  }

  /**
   * Enforce posting policy:
   * - lista group: only MANAGERs can post
   * - privileged groups are best-effort added as MANAGERs
   *
   * IMPORTANT:
   * Some addresses (e.g. aliases / non-group lists) are not valid member keys for Directory API.
   * We log and continue so onboarding can still succeed.
   */
  async enforceListaPostingPolicy(listaGroupEmail: string, privilegedPosterGroups: string[]): Promise<void> {
    const settings = await this.getGroupsSettingsClient();

    const lista = normalizeEmail(listaGroupEmail);
    assertLooksLikeEmail("listaGroupEmail", lista);

    await settings.groups.patch({
      groupUniqueId: lista,
      requestBody: {
        whoCanPostMessage: "ALL_MANAGERS_CAN_POST",
        whoCanViewGroup: "ALL_MEMBERS_CAN_VIEW",
        whoCanViewMembership: "ALL_MEMBERS_CAN_VIEW",
      },
    });

    for (const grpRaw of privilegedPosterGroups) {
      const grp = normalizeEmail(grpRaw);
      assertLooksLikeEmail("privilegedPosterGroup", grp);

      try {
        await this.addMemberToGroup(lista, grp, "MANAGER");
      } catch (e: any) {
        // best-effort: do not break onboarding
        console.warn("enforceListaPostingPolicy: failed to add privileged group as MANAGER", {
          lista,
          grp,
          message: e?.message || String(e),
          code: e?.code || e?.response?.status,
        });
      }
    }
  }

  async sendGenericEmail(
    toEmail: string,
    subject: string,
    bodyText: string
  ): Promise<void> {
    const gmail = await this.getGmailClient();

    const from = normalizeEmail(this.delegatedUserEmail);
    const to = normalizeEmail(toEmail);

    assertLooksLikeEmail("fromEmail (delegated)", from);
    assertLooksLikeEmail("toEmail", to);

    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      bodyText,
    ];

    const raw = Buffer.from(messageParts.join("\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
  }

  // ✅ CHANGED: replyToEmail added
  async sendWelcomeEmail(
    fromEmail: string,
    toEmail: string,
    replyToEmail: string,
    subject: string,
    bodyText: string
  ): Promise<void> {
    const gmail = await this.getGmailClient();

    const from = normalizeEmail(fromEmail);
    const to = normalizeEmail(toEmail);
    const replyTo = normalizeEmail(replyToEmail);

    assertLooksLikeEmail("fromEmail", from);
    assertLooksLikeEmail("toEmail", to);
    assertLooksLikeEmail("replyToEmail", replyTo);

    const messageParts = [
      `From: ${from}`,
      `Reply-To: ${replyTo}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      bodyText,
    ];

    const raw = Buffer.from(messageParts.join("\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
  }
}
