# meal-planner

Application for generating a varied meal plan for kitchens

## Generating hashes for fake db data:

**Password:** node -e "const argon2 = require('argon2'); argon2.hash('password123').then(h => console.log(h))"
**Id:** node -e "console.log(require('crypto').randomUUID())"
