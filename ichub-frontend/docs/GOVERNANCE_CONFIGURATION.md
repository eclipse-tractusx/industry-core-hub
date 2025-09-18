# Governance Policy Configuration

This document explains how to configure governance policies in the Industry Core Hub frontend through Helm charts.

## Configuration Structure

The governance configuration supports ODRL (Open Digital Rights Language) rules with three types:
- **Permission**: Rules that allow specific actions
- **Prohibition**: Rules that forbid specific actions  
- **Obligation**: Rules that require specific actions

All rule types follow the same structure and support automatic permutation generation based on the `strict` setting per policy.

### Helm Configuration Example

```yaml
frontend:
  consumption:
    governance:
      # Each semantic ID can have multiple policies with different strictness
      - semanticid: "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
        policies: 
          # Strict policy - uses exact order as configured
          - strict: true
            permission:
            - action: odrl:use
              LogicalConstraint: odrl:and
              constraints:
                - leftOperand: cx-policy:FrameworkAgreement
                  operator: odrl:eq
                  rightOperand: DataExchangeGovernance:1.0
                - leftOperand: cx-policy:Membership
                  operator: odrl:eq
                  rightOperand: active
                - leftOperand: cx-policy:UsagePurpose
                  operator: odrl:eq
                  rightOperand: cx.core.industrycore:1
            prohibition: []
            obligation: []
          
          # Non-strict policy - generates all permutations
          - strict: false
            permission:
            - action: odrl:use
              LogicalConstraint: odrl:and
              constraints:
                - leftOperand: cx-policy:FrameworkAgreement
                  operator: odrl:eq
                  rightOperand: DataExchangeGovernance:1.0
                - leftOperand: cx-policy:Membership
                  operator: odrl:eq
                  rightOperand: active
            prohibition: []
            obligation: []
      
      # Different semantic ID with its own policies
      - semanticid: "urn:samm:other.semantic:1.0.0#OtherModel"
        policies: 
          - strict: false
            permission:
            - action: odrl:use
              LogicalConstraint: odrl:and
              constraints:
                - leftOperand: cx-policy:FrameworkAgreement
                  operator: odrl:eq
                  rightOperand: DataExchangeGovernance:1.0
                - leftOperand: cx-policy:Membership
                  operator: odrl:eq
                  rightOperand: active
            prohibition: []
            obligation: []
```

## How It Works

### Strict Mode (`strict: true`)

- Uses the exact order of constraints as configured
- Generates exactly 1 policy with the specified constraint order
- Use when order matters for your governance requirements
- Applied per individual policy, not per semantic ID

### Non-Strict Mode (`strict: false`)  

- Automatically generates all possible permutations of constraints
- For 2 constraints: generates 6 policies (2 single + 4 pairs in different orders)
- For 3 constraints: generates 15 policies (3 single + 6 pairs + 6 triples in all orders)
- Use when you want maximum compatibility with different policy interpretations
- Applied per individual policy, allowing mixed modes within the same semantic ID

### Logical Constraints

The system supports configurable logical constraint operators:

- **`LogicalConstraint: odrl:and`** - All constraints must be satisfied (default)
- **`LogicalConstraint: odrl:or`** - Any constraint must be satisfied  
- **No LogicalConstraint** - For single constraints (no logical wrapper needed)

```yaml
# AND logic - all constraints required
- action: odrl:use
  LogicalConstraint: odrl:and
  constraints:
    - leftOperand: cx-policy:Membership
      operator: odrl:eq
      rightOperand: active
    - leftOperand: cx-policy:Purpose
      operator: odrl:eq
      rightOperand: commercial

# OR logic - any constraint sufficient
- action: odrl:use
  LogicalConstraint: odrl:or
  constraints:
    - leftOperand: cx-policy:Role
      operator: odrl:eq
      rightOperand: admin
    - leftOperand: cx-policy:Role
      operator: odrl:eq
      rightOperand: manager

# Single constraint - no logical wrapper
- action: odrl:use
  constraints:
    - leftOperand: cx-policy:Membership
      operator: odrl:eq
      rightOperand: active
```

### Adding New Rule Types

ODRL supports three types of rules: permissions, prohibitions, and obligations. All follow the same structure:

```yaml
policies:
  - strict: true
    permission:
      - action: odrl:use
        LogicalConstraint: odrl:and
        constraints:
          - leftOperand: cx-policy:Membership
            operator: odrl:eq
            rightOperand: active
    prohibition:
      - action: odrl:prohibit
        LogicalConstraint: odrl:and
        constraints:
          - leftOperand: cx-policy:Purpose
            operator: odrl:neq
            rightOperand: research
    obligation:
      - action: odrl:compensate
        LogicalConstraint: odrl:and
        constraints:
          - leftOperand: cx-policy:PaymentRequired
            operator: odrl:eq
            rightOperand: true
```

### Multiple Policies per Semantic ID

You can define multiple policies for the same semantic ID, each with its own strictness setting:

```yaml
- semanticid: "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
  policies: 
    # First policy - strict mode for precise governance
    - strict: true
      permission:
      - action: odrl:use
        LogicalConstraint: odrl:and
        constraints:
          - leftOperand: cx-policy:Membership
            operator: odrl:eq
            rightOperand: active
      prohibition: []
      obligation: []
    
    # Second policy - non-strict mode for flexible access
    - strict: false
      permission:
      - action: odrl:use
        LogicalConstraint: odrl:and
        constraints:
          - leftOperand: cx-policy:FrameworkAgreement
            operator: odrl:eq
            rightOperand: DataExchangeGovernance:1.0
          - leftOperand: cx-policy:Membership
            operator: odrl:eq
            rightOperand: active
          - leftOperand: cx-policy:UsagePurpose
            operator: odrl:eq
            rightOperand: cx.core.industrycore:1
      prohibition: []
      obligation: []
```

## Environment Variable Injection

The configuration is automatically injected as a JSON string in the `GOVERNANCE_CONFIG` environment variable during container startup, and parsed by the frontend application to generate the appropriate ODRL policies for API requests.
