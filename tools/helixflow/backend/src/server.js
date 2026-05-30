import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8100);

app.listen(port, () => {
  console.log(`HelixFlow orchestration API listening on ${port}`);
});
