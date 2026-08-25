export interface SlaCalculationResult {
  targetReceivabilityDate: Date;
  targetFinalResponseDate: Date;
  receivabilitySlaHours: number;
  finalResponseSlaDays: number;
}

export interface SlaStatusResult {
  isReceivabilityOverdue: boolean;
  isFinalResponseOverdue: boolean;
  receivabilityRemainingHours: number;
  finalResponseRemainingDays: number;
  isSuspended: boolean;
  totalSuspendedHours: number;
}

export class SlaCalculator {
  // Jours fériés légaux fixes en Belgique (Mois 1-12, Jour 1-31)
  private static FIXED_BELGIAN_HOLIDAYS = [
    { month: 1, day: 1 },   // Nouvel An
    { month: 5, day: 1 },   // Fête du Travail
    { month: 7, day: 21 },  // Fête Nationale
    { month: 8, day: 15 },  // Assomption
    { month: 11, day: 1 },  // Toussaint
    { month: 11, day: 11 }, // Armistice
    { month: 12, day: 25 }, // Noël
  ];

  /**
   * Calcule le dimanche de Pâques pour une année donnée (Algorithme de Butcher / Meeus)
   */
  private static getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Vérifie si une date donnée est un jour férié officiel en Belgique
   */
  public static isBelgianHoliday(date: Date): boolean {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    // 1. Fêtes fixes
    const isFixed = this.FIXED_BELGIAN_HOLIDAYS.some(h => h.month === month && h.day === day);
    if (isFixed) return true;

    // 2. Fêtes mobiles basées sur Pâques
    const easter = this.getEasterSunday(year);
    const easterTime = easter.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const easterMonday = new Date(easterTime + oneDayMs);
    const ascension = new Date(easterTime + 39 * oneDayMs);
    const pentecostMonday = new Date(easterTime + 50 * oneDayMs);

    const isEasterMon = easterMonday.getUTCMonth() + 1 === month && easterMonday.getUTCDate() === day;
    const isAscension = ascension.getUTCMonth() + 1 === month && ascension.getUTCDate() === day;
    const isPentecostMon = pentecostMonday.getUTCMonth() + 1 === month && pentecostMonday.getUTCDate() === day;

    return isEasterMon || isAscension || isPentecostMon;
  }

  /**
   * Vérifie si un jour est un jour ouvré (hors weekend et fériés belges)
   */
  public static isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getUTCDay(); // 0 = Dimanche, 6 = Samedi
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    return !this.isBelgianHoliday(date);
  }

  /**
   * Ajoute N jours ouvrés à une date donnée
   */
  public static addBusinessDays(startDate: Date, daysToAdd: number): Date {
    const result = new Date(startDate.getTime());
    let added = 0;
    while (added < daysToAdd) {
      result.setUTCDate(result.getUTCDate() + 1);
      if (this.isBusinessDay(result)) {
        added++;
      }
    }
    return result;
  }

  /**
   * Calcule les dates cibles initiales de SLA pour une réclamation
   */
  public static calculateInitialTargets(
    declarationDate: Date,
    receivabilityWorkingDays: number = 2,
    finalResponseCalendarDays: number = 30
  ): SlaCalculationResult {
    const targetReceivability = this.addBusinessDays(declarationDate, receivabilityWorkingDays);

    const targetFinal = new Date(declarationDate.getTime());
    targetFinal.setUTCDate(targetFinal.getUTCDate() + finalResponseCalendarDays);

    return {
      targetReceivabilityDate: targetReceivability,
      targetFinalResponseDate: targetFinal,
      receivabilitySlaHours: receivabilityWorkingDays * 8, // 16h ouvrées
      finalResponseSlaDays: finalResponseCalendarDays,
    };
  }

  /**
   * Ajuste la date cible finale après une période de suspension
   */
  public static adjustFinalResponseDate(
    currentTarget: Date,
    suspendedAt: Date,
    resumedAt: Date
  ): { updatedTarget: Date; addedSuspensionHours: number } {
    const suspensionMs = Math.max(0, resumedAt.getTime() - suspendedAt.getTime());
    const addedHours = Math.round(suspensionMs / (1000 * 60 * 60));
    const updatedTarget = new Date(currentTarget.getTime() + suspensionMs);

    return {
      updatedTarget,
      addedSuspensionHours: addedHours,
    };
  }

  /**
   * Calcule l'état actuel du SLA et le temps restant
   */
  public static evaluateSlaStatus(params: {
    declarationDate: Date;
    targetReceivabilityDate?: Date;
    targetFinalResponseDate?: Date;
    isReceivabilityCompleted?: boolean;
    isClosed?: boolean;
    suspendedAt?: Date;
    totalSuspendedHours?: number;
    currentDate?: Date;
  }): SlaStatusResult {
    const now = params.currentDate || new Date();
    const totalSuspended = params.totalSuspendedHours || 0;
    const isSuspended = !!params.suspendedAt;

    let isReceivabilityOverdue = false;
    let receivabilityRemainingHours = 0;

    if (params.targetReceivabilityDate && !params.isReceivabilityCompleted) {
      const diffMs = params.targetReceivabilityDate.getTime() - now.getTime();
      receivabilityRemainingHours = Math.round(diffMs / (1000 * 60 * 60));
      isReceivabilityOverdue = diffMs < 0;
    }

    let isFinalResponseOverdue = false;
    let finalResponseRemainingDays = 0;

    if (params.targetFinalResponseDate && !params.isClosed) {
      const diffMs = params.targetFinalResponseDate.getTime() - now.getTime();
      finalResponseRemainingDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      isFinalResponseOverdue = diffMs < 0 && !isSuspended;
    }

    return {
      isReceivabilityOverdue,
      isFinalResponseOverdue,
      receivabilityRemainingHours,
      finalResponseRemainingDays,
      isSuspended,
      totalSuspendedHours: totalSuspended,
    };
  }
}
