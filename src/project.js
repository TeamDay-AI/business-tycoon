// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Project Class (phases, quality, deadlines)
// ═══════════════════════════════════════════════════════════════

let nextProjId = 0;

export class Project {
  constructor(template, reputationPremium = 1.0) {
    this.id = nextProjId++;
    this.template = template;
    this.name = template.name + ' #' + (this.id + 1);
    this.phases = [...template.phases];
    this.phaseIdx = 0;
    this.phaseProgress = 0;
    this.phaseTime = template.time / template.phases.length;
    this.state = 'waiting'; // waiting, in_progress, done
    this.assignedAgents = [];
    this.pay = template.cost ? template.basePay : Math.round(template.basePay * reputationPremium);
    this.stalled = false;
    this.qualityScore = 0;
    this.deadline = template.time * 1.3; // tight deadline — miss it and get nothing
    this.dayAge = 0;
    this.salesClosed = false;  // set true when Sales office gates the deal
    this.synergyLabels = [];   // populated on completion
    this.source = 'organic';   // organic | paid | referral
  }

  get currentPhase() { return this.phases[this.phaseIdx]; }
  get targetOffice() { return this.template.office; }
  get progress() { return (this.phaseIdx + this.phaseProgress) / this.phases.length; }
  get isOverdue() { return this.dayAge > this.deadline; }

  advancePhase(qualityContribution) {
    this.qualityScore += qualityContribution || 0;
    this.phaseIdx++;
    this.phaseProgress = 0;
    this.assignedAgents = [];

    if (this.phaseIdx >= this.phases.length) {
      this.state = 'done';
      // Average quality across phases
      this.qualityScore /= this.phases.length;
      return true;
    }
    this.state = 'waiting';
    return false;
  }

  get deadlineRemaining() {
    return Math.max(0, this.deadline - this.dayAge);
  }

  get deadlineUrgent() {
    return this.deadlineRemaining / this.deadline < 0.3;
  }

  getFinalPay() {
    // Quality multiplier: 0.5x to 1.5x (steep curve — bad work hurts, great work rewards)
    const qualityMultiplier = 0.5 + this.qualityScore * 1.0;
    // No deadline penalty here — overdue projects are expired with zero pay in simulation
    return Math.round(this.pay * qualityMultiplier);
  }

  getReputationChange() {
    if (this.qualityScore > 0.7) return 2;  // Great work
    if (this.qualityScore > 0.4) return 1;  // Decent
    if (this.isOverdue) return -1;          // Late delivery
    return 0;
  }
}
