Run pre-deployment checks:
1. Check that .env.example variables are documented (don't read .env itself)
2. Fetch https://art-ai-lifeforms.vercel.app/api/debug and show the JSON result to verify Groq and Gemini are reachable
3. Run git status to show any uncommitted files
4. Run git log --oneline -5 to show recent commits
Report pass/fail for each check.
