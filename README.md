# BuildBoard

BuildBoard is one of my ongoing projects. It is a straightforward platform that brings homeowners together with construction professionals. Users can sign up in one of three roles: Client, Manager or Labourer - then post and apply for projects, manage work and rate each other. Get a feel for the App by exploring this interactive demo:

https://www.figma.com/proto/HaG3R7SuLL3Eh0BFQjcLfP/Mobile?page-id=185%3A2&node-id=189-244&starting-point-node-id=245%3A53&t=CYnp8bhXJhq8OFmg-1

---

## Table of Contents

- [Who’s Who](#whos-who)  
- [Key Features](#key-features)  
- [How It Works](#how-it-works)  
  - [Client Interface](#client-interface)  
  - [Manager Interface](#manager-interface)  
  - [Labourer Interface](#labourer-interface)  
- [Ratings & Reviews](#ratings--reviews)  
- [Licence](#licence)  

---

## Who’s Who

- **Client** – A homeowner or property owner who needs work done.  
- **Manager** – A project coordinator who oversees jobs and matches Labourers to projects.  
- **Labourer** – A skilled worker who applies for projects and completes tasks.

---

## Key Features

- **Role-based sign‑up** — Choose Client, Manager or Labourer.  
- **Project posting** — Clients list jobs around their home.  
- **Job applications** — Labourers browse and apply for suitable projects.  
- **Smart matching** — Managers review applications and assign Labourers.  
- **Search & filters** — Find projects or people by location, skill or rating.  
- **Ratings & reviews** — Everyone earns feedback to build trust.
- **Construction AI chat** — Powered by OpenAI’s `gpt-4o-mini` and optional Google Custom Search.

---

## How It Works

### Client Interface

1. Sign up as a Client.  
2. Post a new project with a title, description, budget and timescale.  
3. Review proposals and select a Manager to oversee the work.

### Manager Interface

1. Sign up as a Manager.  
2. View new Client projects and approve them.  
3. Browse qualified Labourers and assign them to tasks.  
4. Track progress and update the project status.

### Labourer Interface

1. Sign up as a Labourer and list your skills.  
2. Browse open projects that match your profile.  
3. Apply with a proposal and confirm your availability.  
4. Complete the work and await payment and feedback.

---

## Development

Create a `.env` file in the project root with the following variables to enable the Construction AI chat:

```
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-api-key   # optional, for web search
GOOGLE_CX=your-google-search-cx      # optional, for web search
```

Then run the server and mobile apps normally.

## Ratings & Reviews

After each project:  
- **Clients** rate Managers and Labourers.  
- **Managers** rate Labourers.  
- **Labourers** rate Managers and Clients.

All ratings feed into each user’s public profile, helping everyone see who’s reliable and who’s a great fit.

---

## Licence

This project is licenced under the MIT Licence. See the [LICENCE](LICENCE) file for details.  
