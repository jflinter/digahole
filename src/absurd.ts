export default function absurd<A>(_: never): A {
  throw new Error("absurd");
}
