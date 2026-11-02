# Glossary

Domain terms used in the brief and the code. Each rule has one home in the code, named below.

**Deposit account**: a checking or savings account: one that holds the customer's money. The credit card is
not one: its balance is money owed. Only deposit accounts can be transferred from (T3).
Code: `depositAccounts` in `src/lib/money.ts`.

**Total available**: the sum of the deposit accounts' balances, shown on the dashboard as `Total available`
(D3). Code: `totalAvailable` in `src/lib/money.ts`.

**Remaining daily limit**: how much more the customer can transfer today: `dailyTransferLimit −
transferredToday` (T3). Code: `remainingLimit` in `src/lib/money.ts`.
