# Digital Product Passport Visualization

A **dynamic, schema-driven visualization system** that can render **any JSON Schema** with automatic UI generation, charts, metrics, and responsive layouts.

## 🎯 Key Features

- **Schema-Agnostic**: Works with any valid JSON Schema (draft-04+)
- **Automatic UI Generation**: Tabs, metrics, and layouts generated from schema
- **Smart Visualizations**: Auto-detects composition data and metrics for charts
- **Responsive Design**: Dark-themed, mobile-first responsive layout
- **Icon Mapping**: Semantic icon selection based on property keywords
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## 🏗️ Architecture

```text
JSON Schema + Data Payload
        ↓
   SchemaParser (parses and structures)
        ↓
   ParsedProperty[] (typed data structure)
        ↓
   PassportVisualization (header, tabs, metrics)
        ↓
   DynamicRenderer (recursive grid rendering)
        ↓
   Chart Components (composition, progress)
        ↓
   UI (responsive, dark-themed)
```

## 📁 File Structure

```text
passport-consumption/
├── components/
│   ├── PassportVisualization.tsx    # Main visualization with tabs & metrics
│   ├── DynamicRenderer.tsx          # Recursive property renderer
│   ├── CompositionChart.tsx         # Pie chart for composition data
│   ├── MetricProgress.tsx           # Progress bars for metrics
│   └── index.ts                     # Component exports
├── utils/
│   ├── schemaParser.ts              # JSON Schema parser with $ref resolution
│   ├── iconMapper.ts                # Semantic icon mapping (25+ icons)
│   ├── dataFormatter.ts             # Value formatting (dates, numbers, units)
│   └── index.ts                     # Utility exports
├── types/
│   └── index.ts                     # TypeScript type definitions
└── pages/
    └── PassportConsumption.tsx      # Main entry with search & QR scanner
```

## 🚀 Usage

### Basic Usage

```tsx
import { PassportVisualization } from './components';
import schema from './schemas/your-schema.json';

const MyComponent = () => {
  const data = {
    // Your data matching the schema
  };

  return (
    <PassportVisualization
      schema={schema}
      data={data}
      passportId="ABC123"
      onBack={() => console.log('Back clicked')}
    />
  );
};
```

### With Different Schemas

The system works with **any** JSON Schema:

```tsx
// Battery Passport
import batterySchema from './schemas/BatteryPassport-schema.json';

// Product Passport
import productSchema from './schemas/ProductPassport-schema.json';

// Custom Schema
import customSchema from './schemas/MyCustom-schema.json';

// All work the same way!
<PassportVisualization schema={batterySchema} data={batteryData} ... />
<PassportVisualization schema={productSchema} data={productData} ... />
<PassportVisualization schema={customSchema} data={customData} ... />
```

## 🎨 Automatic Visualizations

### Composition Charts (Pie Charts)

Automatically rendered when properties match:

- Keywords: `composition`, `components`, `materials`, `ingredients`, `breakdown`
- Contains numeric values (percentages or amounts)

Example:

```json
{
  "batteryComposition": {
    "cathode": 45.2,
    "anode": 32.8,
    "electrolyte": 15.5,
    "separator": 6.5
  }
}
```

### Progress Bars

Automatically rendered for metrics with:
- Keywords: `cycles`, `capacity`, `health`, `level`, `count`, `usage`
- Numeric type values

Example:
```json
{
  "stateOfHealth": 92,
  "cycleCount": 450
}
```

## 🔧 Customization

### Adding New Icon Mappings

Edit `utils/iconMapper.ts`:

```typescript
export const getIconForProperty = (key: string): React.ElementType => {
  const lowerKey = key.toLowerCase();
  
  // Add your keywords
  if (lowerKey.includes('yourKeyword')) return YourIcon;
  
  // ...existing mappings
};
```

### Custom Formatting

Edit `utils/dataFormatter.ts`:

```typescript
export const formatValue = (value: unknown, type?: string): string => {
  // Add custom formatting logic
  if (typeof value === 'string' && value.startsWith('custom:')) {
    return customFormat(value);
  }
  
  // ...existing formatting
};
```

### Chart Colors

Edit `components/CompositionChart.tsx`:

```typescript
const CHART_COLORS = [
  '#667eea',  // Primary
  '#764ba2',  // Secondary
  '#f093fb',  // Add your colors
  // ...
];
```

## 📊 Schema Requirements

The system works best with schemas that include:

1. **Clear Structure**: Use nested objects for logical grouping
2. **Descriptions**: Add descriptions for better labels and tooltips
3. **Types**: Specify property types (`string`, `number`, `integer`, etc.)
4. **Titles**: Use titles for custom display names

Example:
```json
{
  "type": "object",
  "properties": {
    "performance": {
      "type": "object",
      "title": "Performance Metrics",
      "description": "Key performance indicators",
      "properties": {
        "capacity": {
          "type": "number",
          "description": "Battery capacity in mAh"
        }
      }
    }
  }
}
```

## 🎯 Metrics Extraction

The parser automatically extracts key metrics for the header cards:

- Looks at first 5 top-level properties
- Takes first 2-3 primitive values per property
- Groups by category (parent property name)
- Formats values appropriately

## 🔍 Tab Generation

Tabs are automatically created from:

- Top-level properties in the schema
- Icons mapped from property keys
- Property counts shown in chips
- Empty tabs handled gracefully

## 🌙 Dark Theme

All components use consistent dark theme styling:
- Background: `rgba(255, 255, 255, 0.03)`
- Borders: `rgba(255, 255, 255, 0.08)`
- Text: `#fff` with alpha variations
- Gradient: `#667eea` to `#764ba2`
- Hover effects with subtle animations

## 🚦 Integration Points

### With Search/QR Scanner

```typescript
const handleSearch = async () => {
  const data = await fetchPassportData(passportId);
  setPassportData(data);
  setShowVisualization(true);
};

if (showVisualization && passportData) {
  return (
    <PassportVisualization
      schema={schema}
      data={passportData}
      passportId={passportId}
      onBack={() => setShowVisualization(false)}
    />
  );
}
```

### With API

```typescript
const fetchPassportData = async (id: string) => {
  const response = await fetch(`/api/passports/${id}`);
  return response.json();
};
```

## 🧪 Testing

### Mock Data

```typescript
const mockData = {
  batteryIdentification: {
    batteryIDDMCCode: 'BAT123',
    batteryModel: 'IMR18650V1'
  },
  performance: {
    capacity: 2600,
    voltage: 3.7
  }
};
```

### Different Schemas

Test with various schema structures to verify dynamic rendering:
- Simple flat objects
- Deeply nested structures
- Arrays of objects
- Mixed types

## 📝 Type Definitions

### Core Types

```typescript
interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  // ...
}

interface ParsedProperty {
  key: string;
  label: string;
  value: unknown;
  type: string;
  description?: string;
  children?: ParsedProperty[];
}
```

## 🎨 UI Components

### PassportVisualization
Main container with header, metrics cards, tabs, and content area.

### DynamicRenderer
Recursive renderer for any property structure with automatic chart detection.

### CompositionChart
SVG-based pie chart with interactive legend and hover effects.

### MetricProgress
Linear progress bar with percentage overlay and color variants.

## 🔄 Future Enhancements

- [ ] Bar charts for time-series data
- [ ] Gauge charts for single metrics
- [ ] Data export (PDF, CSV)
- [ ] Comparison view (multiple passports)
- [ ] Custom theme support
- [ ] Print-friendly layout
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)

## 📄 License

Apache-2.0 - See LICENSE file for details

---

**Built with**: React 18, TypeScript, MUI 6, Dynamic Schema Parsing
