# Gander Maintenance App

AI-powered maintenance dashboard for Part 135 charter operators, specifically designed for Gulfstream G550 aircraft operations.

## Features

### Core Maintenance Management
- **Aircraft Fleet Management** - Track multiple G550 aircraft with real-time status
- **Work Order System** - Create, assign, and manage maintenance tasks
- **Maintenance Scheduling** - A-checks (500hrs), C-checks (2400hrs), and regulatory intervals
- **Parts Inventory** - Track consumables, rotables, and life-limited components
- **Compliance Monitoring** - Part 135 regulatory compliance tracking

### AI-Powered Features
- **Voice Assistant** - Speech-to-text maintenance commands and queries
- **Predictive Maintenance** - AI-driven maintenance recommendations
- **Smart Scheduling** - Optimize maintenance windows for fleet availability
- **Natural Language Processing** - Process voice commands for common tasks

### Safety & Compliance
- **Part 135 Compliance** - FAR 135.411, 135.419 tracking
- **Digital Signatures** - Mechanic and inspector sign-offs
- **Audit Trail** - Complete maintenance history and documentation
- **Real-time Alerts** - Overdue inspections and critical items

## Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, authentication, real-time)
- **AI**: OpenAI API for maintenance assistant and voice processing
- **Voice**: Web Speech API for speech recognition and synthesis
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Quick Start

### Prerequisites
- Node.js 18.17 or later
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   
   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_OPERATOR_NAME=your_operator_name
   NEXT_PUBLIC_OPERATOR_CERTIFICATE=your_part135_certificate_number
   ```

3. **Set up Supabase database**
   
   Create the following tables in your Supabase project:
   
   ```sql
   -- Aircraft table
   create table aircraft (
     id uuid default gen_random_uuid() primary key,
     tail_number text unique not null,
     make text not null default 'Gulfstream',
     model text not null default 'G550',
     serial_number text not null,
     year_of_manufacture integer not null,
     total_aircraft_time numeric default 0,
     total_cycles integer default 0,
     is_active boolean default true,
     certificate_of_airworthiness text,
     last_inspection_date timestamp with time zone,
     next_inspection_due timestamp with time zone,
     created_at timestamp with time zone default timezone('utc'::text, now()),
     updated_at timestamp with time zone default timezone('utc'::text, now())
   );
   
   -- Maintenance intervals table
   create table maintenance_intervals (
     id uuid default gen_random_uuid() primary key,
     aircraft_id uuid references aircraft(id) on delete cascade,
     interval_type text not null check (interval_type in ('DAILY', '100_HOUR', 'A_CHECK', 'C_CHECK', 'ANNUAL', 'PROGRESSIVE')),
     description text not null,
     interval_hours integer,
     interval_cycles integer,
     interval_calendar integer,
     last_completed_at timestamp with time zone,
     last_completed_hours numeric,
     next_due_at timestamp with time zone not null,
     next_due_hours numeric not null,
     is_overdue boolean default false,
     priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
     estimated_downtime numeric not null,
     estimated_cost numeric not null,
     created_at timestamp with time zone default timezone('utc'::text, now()),
     updated_at timestamp with time zone default timezone('utc'::text, now())
   );
   
   -- Work orders table
   create table work_orders (
     id uuid default gen_random_uuid() primary key,
     aircraft_id uuid references aircraft(id) on delete cascade,
     work_order_number text unique not null,
     title text not null,
     description text not null,
     status text not null check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED')),
     priority text not null check (priority in ('ROUTINE', 'URGENT', 'AOG')),
     category text not null check (category in ('SCHEDULED', 'UNSCHEDULED', 'MODIFICATION', 'REPAIR')),
     mechanic_assigned text,
     inspector_assigned text,
     estimated_hours numeric not null,
     actual_hours numeric,
     scheduled_start_date timestamp with time zone not null,
     actual_start_date timestamp with time zone,
     completed_date timestamp with time zone,
     created_at timestamp with time zone default timezone('utc'::text, now()),
     updated_at timestamp with time zone default timezone('utc'::text, now())
   );
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Voice Assistant Usage

The voice assistant supports natural language commands for common maintenance tasks:

### Supported Commands
- **"Show aircraft status"** - Get fleet overview and availability
- **"Create work order for N123AB"** - Start work order creation process
- **"Check maintenance schedule"** - View upcoming inspections and due dates
- **"What's overdue?"** - List all overdue maintenance items
- **"Part 135 compliance status"** - Check regulatory compliance

### Browser Compatibility
- Chrome/Chromium (recommended)
- Edge
- Safari (limited support)
- Firefox (experimental)

## G550 Maintenance Intervals

The app is pre-configured with Gulfstream G550 maintenance intervals:

| Inspection Type | Interval | Description |
|----------------|----------|-------------|
| Daily | 24 hours | Pre-flight inspection |
| 100-Hour | 100 flight hours | Progressive maintenance check |
| A-Check | 500 flight hours | Line maintenance inspection |
| C-Check | 2400 flight hours | Heavy maintenance check |
| Annual | 12 months | Annual inspection per Part 135.419 |
| Progressive | 90 days | Continuous airworthiness program |

## Project Structure

```
├── app/                    # Next.js 14 app router
│   ├── page.tsx           # Main dashboard
│   ├── aircraft/          # Aircraft management pages
│   ├── work-orders/       # Work order management
│   └── api/               # API routes
├── components/            # Reusable React components
│   ├── VoiceAssistant.tsx # Voice interface component
│   └── ui/                # UI components
├── lib/                   # Utilities and configurations
│   ├── supabase.ts        # Database client
│   ├── openai.ts          # AI client and prompts
│   └── maintenance-utils.ts # Aviation calculations
├── types/                 # TypeScript definitions
│   └── index.ts           # Maintenance-specific types
└── env.example            # Environment variables template
```

## Contributing

This is an aviation maintenance application where safety and regulatory compliance are paramount. When contributing:

1. **Safety First** - All features must prioritize operational safety
2. **Regulatory Compliance** - Ensure Part 135 requirements are met
3. **Testing** - Thoroughly test maintenance calculations and scheduling
4. **Documentation** - Provide clear documentation for aviation personnel

## Support

For technical support or aviation-specific questions, please refer to:
- FAA Part 135 regulations
- Gulfstream G550 Maintenance Planning Document
- Your organization's maintenance procedures

## License

Private aviation maintenance software. Not for public distribution. 