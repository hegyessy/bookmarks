/** @jsx h */
import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { tw } from "@twind";

type Search = {
  query: string;
};

export default function Search({ query }: Search) {
  const [q, setQ] = useState(query);
  const inputRef = useRef() as any;
  const form = useRef() as any;

  useEffect(() => {
    inputRef.current.focus();
  }, [q]);

  const submit = () => {
    return form.current.submit();
  };

  return (
    <form ref={form}>
      <input
        ref={inputRef}
        class={tw`bg-gray-100 rounded w-1/2 mb-2 px-3 py-2`}
        type="search"
        value={q || ""}
        name="q"
        placeholder="Search"
        onKeyUp={(event) => {
          event.currentTarget.value === ""
            ? submit()
            : setQ(event.currentTarget.value);
        }}
      />
    </form>
  );
}
