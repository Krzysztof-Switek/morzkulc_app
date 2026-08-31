import {ServiceTask} from "../types";
import {grantInstructorReward, getAllInstructorRewardEnrollmentIds} from "../../modules/basen/basen_godziny_service";

type Payload = Record<string, never>;

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Task: basen.grantInstructorRewards
 *
 * Nagradza instruktorów 1 godziną basenową za KAŻDY PRZEPROWADZONY termin, na który
 * byli zapisani jako instructor — dopiero PO dacie terminu (nie przy samym zapisie,
 * żeby nie nagradzać kogoś kto się zapisał ale termin np. odwołano — wtedy enrollment
 * jest "cancelled" i w ogóle nie wchodzi do rozpatrzenia). Uruchamiane cyklicznie
 * (basenGrantInstructorRewardsDaily), bezpieczne do wielokrotnego odpalenia — pomija
 * zapisy, które już dostały nagrodę (sprawdzane po enrollmentId w ledgerze).
 */
export const basenGrantInstructorRewardsTask: ServiceTask<Payload> = {
  id: "basen.grantInstructorRewards",
  description: "Nagradza instruktorów 1h basenową za każdy przeprowadzony (miniony) termin.",

  validate: () => {
    // brak wymaganych pól
  },

  run: async (_payload, ctx) => {
    const today = todayIso(ctx.now);

    const sessionsSnap = await ctx.firestore
      .collection("basen_sessions")
      .where("date", "<", today)
      .get();

    if (sessionsSnap.empty) {
      return {ok: true, message: "Brak minionych terminów do rozliczenia.", details: {granted: 0}};
    }

    const alreadyRewarded = await getAllInstructorRewardEnrollmentIds(ctx.firestore);

    let granted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const sessionDoc of sessionsSnap.docs) {
      const session = sessionDoc.data() as any;
      const slotLabels = Object.keys(session.slots || {});

      for (const slot of slotLabels) {
        const enrollmentsSnap = await ctx.firestore
          .collection("basen_enrollments")
          .where("sessionId", "==", sessionDoc.id)
          .where("slot", "==", slot)
          .where("type", "==", "instructor")
          .where("status", "==", "active")
          .get();

        for (const enrollDoc of enrollmentsSnap.docs) {
          const enrollment = enrollDoc.data() as any;
          if (alreadyRewarded.has(enrollDoc.id)) {
            skipped++;
            continue;
          }
          if (ctx.dryRun) {
            granted++;
            continue;
          }
          try {
            await grantInstructorReward(ctx.firestore, {
              uid: enrollment.userUid,
              sessionId: sessionDoc.id,
              slot,
              enrollmentId: enrollDoc.id,
              performedBy: "system:basenGrantInstructorRewards",
            });
            granted++;
          } catch (e: any) {
            errors.push(`${enrollDoc.id}: ${e?.message || String(e)}`);
            ctx.logger.error("basenGrantInstructorRewards: grant failed", {enrollmentId: enrollDoc.id, message: e?.message});
          }
        }
      }
    }

    return {
      ok: errors.length === 0,
      message: `granted=${granted}, skipped=${skipped}, errors=${errors.length}`,
      details: {granted, skipped, errors},
    };
  },
};
