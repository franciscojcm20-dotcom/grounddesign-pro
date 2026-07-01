// ─── Core types for the Explainable Engineering Motor ─────────────────────────
// Every calculation returns ExplainableResult<T> — result + full 4-pillar
// justification. No result is ever delivered as a "black box".

// ─── The 4 Pillars ────────────────────────────────────────────────────────────

export interface PhysicalFoundation {
  /** Name of the physical phenomenon being modelled */
  phenomenon: string;
  /** Historical/scientific origin of the model or method */
  origin: string;
  /** Expected electrical behavior of the system */
  expectedBehavior: string;
  /** Electromagnetic effects involved */
  electromagneticEffects: string[];
  /** Simplifying hypotheses assumed by the model */
  hypotheses: string[];
  /** Known limitations of the physical model */
  modelLimitations: string[];
}

export interface Variable {
  symbol: string;
  name: string;
  value: string | number;
  unit: string;
  source?: string;  // where this value came from
}

export interface Step {
  index: number;
  description: string;
  expression: string;   // the equation being applied at this step
  partialResult: string; // value computed at this step with units
}

export interface SensitivityEntry {
  variable: string;
  change: string;     // e.g. "+10 %"
  impact: string;     // e.g. "Nd increases by 8 %"
}

export interface MathFoundation {
  /** Primary formula (plain text, e.g. "Nd = Ng · Ad · Cd · 10⁻⁶") */
  formula: string;
  /** All variables used */
  variables: Variable[];
  /** Numbered derivation steps */
  stepByStep: Step[];
  /** Final computed result with units */
  finalResult: string;
  /** Dimensional consistency note */
  dimensionalAnalysis: string;
  /** Optional sensitivity analysis */
  sensitivityAnalysis?: SensitivityEntry[];
}

export interface NormativeFoundation {
  /** Standard identifier, e.g. "IEC 62305-2" */
  standard: string;
  /** Edition string, e.g. "Ed. 2.0 2010-12" */
  edition: string;
  /** Clause/chapter reference */
  chapter: string;
  /** Article reference if applicable */
  article?: string;
  /** Table reference */
  table?: string;
  /** Figure reference */
  figure?: string;
  /** Equation number in the standard */
  equation?: string;
  /** Conditions required for this standard to apply */
  applicabilityConditions: string[];
  /** Known limitations or scope of the standard */
  standardLimitations: string[];
  /** Note when multiple standards conflict or overlap */
  hierarchyNote?: string;
}

export interface DiscardedAlternative {
  name: string;
  reason: string;
}

export interface EngineeringFoundation {
  /** Description of the chosen solution */
  selectedSolution: string;
  /** Technical justification for this choice */
  whySelected: string;
  /** Other methods considered and why they were not chosen */
  discardedAlternatives: DiscardedAlternative[];
  /** Technical advantages */
  advantages: string[];
  /** Technical disadvantages or limitations */
  disadvantages: string[];
  /** LPS protection level (I = highest, IV = minimum) or N/A */
  safetyLevel: 'I' | 'II' | 'III' | 'IV' | 'N/A';
  /** Description of redundancy in the solution */
  redundancy: string;
  /** Ease of construction and installation */
  constructability: string;
  /** Impact on long-term maintenance */
  maintenanceImpact: string;
  /** Expected service life of the system */
  expectedLifespan: string;
}

// ─── The central type ─────────────────────────────────────────────────────────

export interface ExplainableResult<T> {
  result: T;
  explanation: {
    physical:     PhysicalFoundation;
    mathematical: MathFoundation;
    normative:    NormativeFoundation;
    engineering:  EngineeringFoundation;
  };
}

// ─── IEC 62305-2 Risk Assessment types ───────────────────────────────────────

export type StructureType =
  | 'residential'
  | 'farm'
  | 'industry'
  | 'commercial'
  | 'public'
  | 'hospital'
  | 'heritage'
  | 'datacenter'
  | 'telecom'
  | 'explosive';

export type EnvironmentType =
  | 'hilltop'    // Cd = 0.25 — isolated hilltop
  | 'rural'      // Cd = 0.5  — rural/open field
  | 'suburban'   // Cd = 1.0  — suburban
  | 'urban';     // Cd = 2.0  — dense urban

export type SoilType = 'agricultural' | 'clay' | 'sandy' | 'rock' | 'concrete' | 'asphalt';

export interface StructureParams {
  length:  number;   // m
  width:   number;   // m
  height:  number;   // m
  type:    StructureType;
  /** Internal wiring present (affects NM, NI)? */
  hasInternalWiring: boolean;
  /** Metal roof or facade? */
  metalRoof: boolean;
  soilType: SoilType;
}

export interface LocationParams {
  /** Ground flash density in flashes/km²/year */
  Ng: number;
  environment: EnvironmentType;
  /** Optional: latitude for reference (not used in calculation) */
  latitude?: number;
  /** Optional: longitude */
  longitude?: number;
  /** Country / region name */
  region?: string;
}

export interface ExistingProtection {
  /** LPS installed? */
  hasLPS: boolean;
  /** LPS protection level if installed */
  lpsLevel?: 'I' | 'II' | 'III' | 'IV';
  /** SPD installed at service entrance? */
  hasSPD: boolean;
  /** Bonding / equipotential bonding in place? */
  hasBonding: boolean;
  /** Shielding factor (0 = no shielding, 1 = full) */
  shieldingFactor?: number;
}

export interface LossParams {
  /** Cost of structure in USD (for R4 economic loss) */
  structureCost?: number;
  /** Cost of internal equipment in USD (for R4) */
  equipmentCost?: number;
  /** Number of persons at risk per year × exposure time */
  personsAtRisk?: number;
  /** Service continuity requirement (for R2) */
  criticalService?: boolean;
}

// ─── Risk result types ────────────────────────────────────────────────────────

export interface RiskComponent {
  symbol: string;      // e.g. "NA"
  name: string;        // e.g. "Annual number of dangerous events due to flashes to structure"
  value: number;
  formula: string;
  contributionToR: number;  // fraction of total R this contributes
}

export interface RiskComponents {
  // Flash frequencies
  ND:  number;   // dangerous events to structure per year
  NM:  number;   // dangerous events due to flashes near structure
  NI:  number;   // dangerous events due to flashes to incoming services
  NL:  number;   // dangerous events due to flashes near incoming services
  // Risk components (see IEC 62305-2 Table 1)
  RA:  number;   // injury of living beings by touch/step voltages
  RB:  number;   // physical damage to structure
  RC:  number;   // failure of internal systems
  RM:  number;   // injury due to LEMP
  RU:  number;   // injury via incoming services
  RV:  number;   // physical damage via incoming services
  RW:  number;   // failure of internal systems via incoming services
  RZ:  number;   // failure via LEMP on incoming services
}

export interface RiskResult {
  /** Risk of loss of human life */
  R1: number;
  /** Risk of loss of service to the public */
  R2: number;
  /** Risk of loss of cultural heritage */
  R3: number;
  /** Risk of loss of economic value */
  R4: number;
  /** Tolerable risk values per IEC 62305-2 Table 2 */
  RT: { R1: number; R2: number; R3: number; R4: number };
  /** Whether protection is required for each loss type */
  required: { R1: boolean; R2: boolean; R3: boolean; R4: boolean };
  /** Detailed risk components */
  components: RiskComponents;
  /** Environment factor Cd */
  Cd: number;
  /** Equivalent collection area in m² */
  Ad: number;
  /** Annual number of dangerous events Nd */
  Nd: number;
}

// ─── Protection method types ──────────────────────────────────────────────────

export interface RollingSphereResult {
  /** Rolling sphere radius in m */
  radius: number;
  /** Whether the structure is fully protected */
  fullyProtected: boolean;
  /** Unprotected zones (description) */
  unprotectedZones: string[];
  /** Minimum number of down conductors required */
  minDownConductors: number;
  /** Maximum spacing between down conductors in m */
  maxDownConductorSpacing: number;
  /** Number of earth termination electrodes required */
  earthTerminations: number;
}

export interface AngleMethodResult {
  /** Protection angle in degrees */
  alpha: number;
  /** Whether the air termination covers the structure */
  coversStructure: boolean;
  /** Height of air termination rod required in m */
  requiredRodHeight: number;
  /** Maximum horizontal reach from rod tip in m */
  horizontalReach: number;
}

export interface MeshMethodResult {
  /** Mesh size in m × m */
  meshWidth:  number;
  meshLength: number;
  /** Whether the mesh is sufficient for the structure */
  complies: boolean;
  /** Total conductor length required in m */
  totalConductorLength: number;
}
