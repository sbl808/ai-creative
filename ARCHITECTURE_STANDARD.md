# AI Creative Studio — Architecture Standard

**Document version:** 1.0.0  
**Status:** Proposed standard for review  
**Architecture direction:** Versioned Shared Foundation + Isolated Studios  
**Scope:** Architecture and engineering standard only

## 1. Purpose

This document defines the rules that future AI Creative Studio changes should follow so that studios can be added, updated, disabled, replaced, or removed with minimal unintended impact on other studios.

This is a target standard, not a claim that every rule is already implemented in the current repository. Before changing code, an AI coding agent or developer must inspect the current implementation and report any differences from this standard.

## 2. Core architecture

The application is organized into three responsibilities:

1. **Shared Foundation** — reusable technical infrastructure and stable contracts.
2. **Studio modules** — independently owned studio-specific behavior.
3. **Application shell and integration points** — navigation, authentication/authorization, studio discovery, and connections between the UI and backend through documented contracts.

A shared foundation is not the same thing as a Global Brain prompt. Technical reuse and creative instructions must remain separate.

### 2.1 Shared Foundation

The Shared Foundation may contain common technical capabilities such as:

- shared interfaces and data contracts;
- configuration parsing and validation;
- common error and result conventions;
- authentication/authorization integration points;
- logging and diagnostics;
- version and dependency compatibility checks;
- reusable test utilities.

The Shared Foundation must not become a storage location for all studio-specific business rules, prompts, workflows, templates, or output schemas. Add a shared capability only when more than one module genuinely needs it and the contract can be kept stable.

### 2.2 Isolated Studio modules

AI Creative Studio has six studio areas:

- Story
- Content
- Short
- Image
- Voice
- Shop

Each studio owns its domain-specific:

- business logic and workflows;
- Brain configuration and creative rules;
- templates and prompt construction;
- input and output schemas;
- validation and quality checks;
- studio-specific tests and documentation.

A studio should be changeable without requiring unrelated studio changes. Shared behavior belongs in the Shared Foundation or a documented public contract, not in another studio's private implementation.

### 2.3 Application shell

The shell may provide common navigation, layout, session handling, studio discovery, and shared UI primitives. It must not silently replace studio-owned business logic with hidden global behavior.

A registry entry alone must not be described as sufficient to add a fully working studio unless the current implementation has been verified to generate and connect every required UI route, backend route, access gate, CMS configuration, and test automatically.

## 3. Studio isolation contract

Every studio must follow these rules:

1. Do not import or call another studio's private/internal modules.
2. Do not modify another studio's Brain, workflow, templates, prompts, schemas, or behavior as an incidental side effect.
3. Reuse shared capabilities only through documented, versioned contracts.
4. Keep studio-specific configuration and output schemas within that studio's ownership boundary.
5. Validate studio inputs and outputs at the relevant boundary.
6. Add or update tests for the changed studio and for any shared contract it consumes.
7. If a change intentionally affects multiple studios, identify each affected studio and obtain approval for that broader scope before implementation.
8. A disabled, missing, or invalid optional studio integration must not break unrelated studios.

Any exception must be documented with its reason, owner, impact, and tests.

## 4. Versioned module registry and dependencies

The module registry should be the explicit source of truth for studio identity and integration metadata, to the extent supported by the implementation. Registry metadata should identify a studio and its supported integration points without embedding the studio's full business logic.

Where module versioning is implemented, record:

- studio/module identifier;
- module version;
- required Shared Foundation contract/API version;
- optional integrations and their compatible versions;
- configuration/schema version where relevant;
- validation status.

Do not claim that registry version enforcement exists until it is implemented and tested.

### 4.1 Dependency categories

Dependencies must be classified as:

- **Required runtime:** the studio cannot operate correctly without it.
- **Optional runtime:** the studio can operate with a defined fallback when it is unavailable.
- **Development/test only:** used for building, linting, testing, or verification and not required at runtime.

Avoid circular dependencies. Shared Foundation must not depend on studio modules. One studio must not depend on another studio's private code.

### 4.2 Semantic versioning policy

Use Semantic Versioning (MAJOR.MINOR.PATCH) for versioned public contracts:

- **MAJOR:** an incompatible contract or behavior change.
- **MINOR:** a backward-compatible capability addition.
- **PATCH:** a backward-compatible fix.

A studio may declare a compatible range of Shared Foundation versions. Before upgrading a shared dependency, inspect all consumers, run contract and regression tests, and document any required migration or coordinated change.

These rules describe the required policy; they do not imply that all modules currently publish or enforce semantic versions.

## 5. AI Brain architecture

The Brain system contains 12 ordered layers. The layer names and order below are normative and must not be silently renamed, skipped, or reordered.

| Order | Layer | Responsibility |
|---|---|---|
| 00 | 00_GATEKEEPER | Check request eligibility, required inputs, allowed mode, and preconditions. |
| 01 | 01_CORE | Define the core role, mission, and stable operating principles. |
| 02 | 02_MEMORY | Provide only relevant, permitted session or project context. |
| 03 | 03_KNOWLEDGE | Supply domain knowledge and verified reference facts. |
| 04 | 04_WORKFLOW | Define the ordered task process and decision points. |
| 05 | 05_TEMPLATE | Define the structure or format used for the requested output. |
| 06 | 06_PROMPT_GEN | Assemble the effective instructions for the generation task. |
| 07 | 07_QUALITY_CHECK | Check completeness, consistency, format, and quality criteria. |
| 08 | 08_FEEDBACK_LOOP | Apply permitted user feedback and iteration rules. |
| 09 | 09_SAFETY_GUARD | Apply safety, privacy, policy, and studio-specific restrictions. |
| 10 | 10_FINAL_OUTPUT | Produce the final response in the required output schema. |
| 11 | 11_POST_NOTE | Record permitted follow-up notes or next-step metadata. |

The layer order is a logical contract. It does not require every layer to be a separate source file, but the implementation and tests must preserve the defined responsibilities and order.

### 5.1 Brain scopes

Brain configuration may be scoped to:

- **GLOBAL** — approved cross-studio baseline only;
- **STUDIO** — rules for one studio;
- **TYPE** — rules for one type or mode within a studio;
- **WORKFLOW** — rules for one workflow;
- **TEMPLATE** — rules for one output template.

A GLOBAL scope must not automatically inject every creative instruction into every studio. Global instructions should be limited to genuinely shared requirements. Each studio must explicitly resolve which scopes apply to a generation request.

### 5.2 Merge and conflict rules

The Brain assembly process must:

1. validate the requested studio, type, workflow, and template identifiers;
2. load only configuration permitted for those scopes;
3. apply documented precedence rules per field or configuration section;
4. preserve protected safety and platform constraints;
5. detect invalid or conflicting configuration instead of silently choosing an arbitrary value;
6. validate the assembled result before generation;
7. run the applicable quality and safety checks.

A lower-level configuration may override a higher-level default only where the field is explicitly overridable. Protected rules cannot be removed by a studio, type, workflow, or template override. Missing optional configuration may use a documented fallback; missing required configuration must produce a clear validation error.

Do not concatenate every prompt from every scope indiscriminately. The merge policy must be explicit, testable, and scoped.

## 6. Contracts and validation

Public contracts should define the accepted inputs, outputs, errors, and compatibility expectations for shared capabilities and studio integration points.

Validation should cover, where applicable:

- studio and mode identifiers;
- configuration schema and required fields;
- Brain layer ordering and required layer presence;
- scope compatibility and merge precedence;
- output schema and required fields;
- dependency compatibility;
- access gates and authorization outcomes.

Validation errors should be actionable and must not expose secrets, private user data, or sensitive internal configuration.

## 7. Testing requirements

The applicable test suite should include:

1. **Unit tests** for changed logic.
2. **Contract tests** for public Shared Foundation interfaces.
3. **Studio isolation tests** to detect prohibited cross-studio imports or side effects.
4. **Brain assembly tests** for scope selection, merge precedence, conflicts, and missing configuration.
5. **12-layer regression tests** for the exact layer identifiers and order.
6. **Integration tests** for the affected UI/backend paths and access gates.
7. **Security tests** for authorization, data boundaries, and failure behavior.
8. **Regression tests** for affected existing functionality.

A test must not be weakened or removed merely to make a change pass. If an existing test is incorrect, explain the evidence and propose the smallest correction separately.

Report which tests actually ran and their results. Do not claim that tests, migrations, deployment, or remote services were verified when they were not.

## 8. Release, compatibility, and rollback

Before a shared contract change:

1. identify all consumers and affected studios;
2. review compatibility and migration requirements;
3. update the relevant tests and documentation;
4. run the applicable checks;
5. document release and rollback steps.

Changes to one studio should be released independently when the architecture and deployment mechanism support it. Shared Foundation changes require consumer compatibility checks.

Database schema changes, migrations, production configuration changes, and deployment are separate operations. They require explicit authorization and must not be inferred from approval to change documentation or application code.

A rollback plan must identify the version or commit to restore, the behavior affected, and any data compatibility constraints. Do not claim rollback safety without checking those constraints.

## 9. AI coding agent operating rules

Any AI coding agent working in this repository must:

1. inspect the current branch, relevant files, tests, and open PR overlap before editing;
2. distinguish verified current behavior from the target architecture in this document;
3. list the exact proposed files and expected impact before implementation;
4. wait for explicit approval when required by the task or user;
5. use a dedicated branch and never edit main directly;
6. avoid unrelated refactors and keep changes within the approved scope;
7. never modify unrelated studio logic, SQL, migrations, workflows, secrets, database state, or deployment settings without separate approval;
8. report the exact files changed, checks run, results, and known limitations;
9. stop and report if the approved scope cannot be completed safely;
10. request separate approval before opening/merging a PR, running remote migrations, creating databases, or deploying when those actions were not explicitly authorized.

## 10. Current implementation versus target standard

This document defines the intended standard. It does not certify that the repository currently implements every listed capability.

Before treating a requirement as implemented, verify the relevant source, configuration, and tests. In particular, do not assume that:

- the 12 Brain layers are already implemented end to end;
- version compatibility is enforced by the registry;
- adding a registry entry automatically completes all studio integration;
- a CI success means a deployment succeeded;
- migration files listed in the repository have been applied to a remote database;
- a shared prompt or global setting affects every studio.

Record verified gaps in a separate implementation plan. Do not silently expand a documentation-only task into code, schema, workflow, database, or deployment changes.

## 11. Acceptance checklist

A change aligned with this standard should satisfy all applicable items:

- [ ] Shared technical infrastructure is separated from studio-specific creative behavior.
- [ ] Studio ownership boundaries and public integration contracts are respected.
- [ ] Dependencies are explicit and circular/private cross-studio dependencies are avoided.
- [ ] Version compatibility and impact on consumers are reviewed.
- [ ] The 12 Brain layers use the exact identifiers and order defined in this document.
- [ ] Brain scope selection and merge precedence are explicit and validated.
- [ ] Relevant unit, contract, isolation, integration, security, and regression tests pass.
- [ ] Documentation distinguishes current verified behavior from target behavior.
- [ ] The change stays within approved files and scope.
- [ ] Release, rollback, database, migration, and deployment claims are supported by verification.

---

**Change control:** Update this standard deliberately. Changes to the 12-layer contract, scope precedence, studio isolation rules, or shared public interfaces require impact analysis and regression coverage.
