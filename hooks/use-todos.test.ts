import { act, renderHook, waitFor } from "@testing-library/react";
import { useTodos } from "@/hooks/use-todos";

beforeEach(() => {
  localStorage.clear();
});

describe("useTodos 우선순위", () => {
  it("addTodo에 전달한 우선순위로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("장보기", "high");
    });

    expect(result.current.todos[0]).toMatchObject({
      text: "장보기",
      priority: "high",
      completed: false,
    });
  });

  it("우선순위를 생략하면 기본값(medium)으로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("청소");
    });

    expect(result.current.todos[0].priority).toBe("medium");
  });

  it("priority가 없는 기존 저장 데이터는 medium으로 보정해 로드한다", async () => {
    localStorage.setItem(
      "todos",
      JSON.stringify([{ id: "1", text: "구버전 할 일", completed: false }])
    );

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].priority).toBe("medium");
  });

  it("추가한 우선순위를 localStorage에 저장한다", async () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("장보기", "low");
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "[]");
      expect(stored[0]?.priority).toBe("low");
    });
  });
});

describe("useTodos 마감일", () => {
  it("addTodo에 전달한 마감일로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("회의", "medium", "2026-07-01");
    });

    expect(result.current.todos[0]).toMatchObject({
      text: "회의",
      dueDate: "2026-07-01",
    });
  });

  it("마감일을 생략하면 dueDate 없이 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("청소");
    });

    expect(result.current.todos[0].dueDate).toBeUndefined();
  });

  it("새로 추가한 Todo에는 생성 시각(createdAt)이 기록된다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("회의");
    });

    expect(typeof result.current.todos[0].createdAt).toBe("number");
  });

  it("createdAt이 없는 기존 데이터는 number로 보정해 로드한다", async () => {
    localStorage.setItem(
      "todos",
      JSON.stringify([
        { id: "1", text: "구버전 할 일", completed: false, priority: "medium" },
      ])
    );

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(typeof result.current.todos[0].createdAt).toBe("number");
  });
});

describe("useTodos 카테고리", () => {
  it("addTodo에 전달한 카테고리로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("보고서", "medium", undefined, "work");
    });

    expect(result.current.todos[0].category).toBe("work");
  });

  it("카테고리를 생략하면 category 없이 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("청소");
    });

    expect(result.current.todos[0].category).toBeUndefined();
  });
});

describe("useTodos addTodo 공백 방어", () => {
  it("공백만 있는 텍스트는 추가하지 않는다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("   ");
    });

    expect(result.current.todos).toEqual([]);
  });
});

describe("useTodos 토글/삭제", () => {
  function addThree(result: { current: ReturnType<typeof useTodos> }) {
    act(() => {
      result.current.addTodo("c");
      result.current.addTodo("b");
      result.current.addTodo("a");
    });
    // addTodo는 새 항목을 앞에 붙이므로 todos는 [a, b, c] 순서
    return result.current.todos.map((todo) => todo.id);
  }

  it("toggleTodo는 지정한 id의 completed만 반전시킨다", () => {
    const { result } = renderHook(() => useTodos());
    const [, bId] = addThree(result);

    act(() => {
      result.current.toggleTodo(bId);
    });

    const byId = Object.fromEntries(
      result.current.todos.map((todo) => [todo.id, todo])
    );
    expect(byId[bId].completed).toBe(true);
    expect(result.current.todos.filter((t) => t.id !== bId).every((t) => !t.completed)).toBe(true);
  });

  it("존재하지 않는 id로 toggleTodo를 호출해도 기존 항목은 변하지 않는다", () => {
    const { result } = renderHook(() => useTodos());
    addThree(result);
    const before = result.current.todos;

    act(() => {
      result.current.toggleTodo("no-such-id");
    });

    expect(result.current.todos).toEqual(before);
  });

  it("deleteTodo는 지정한 id만 제거하고 나머지 순서를 유지한다", () => {
    const { result } = renderHook(() => useTodos());
    const [aId, bId, cId] = addThree(result);

    act(() => {
      result.current.deleteTodo(bId);
    });

    expect(result.current.todos.map((t) => t.id)).toEqual([aId, cId]);
  });

  it("존재하지 않는 id로 deleteTodo를 호출해도 목록이 변하지 않는다", () => {
    const { result } = renderHook(() => useTodos());
    addThree(result);
    const before = result.current.todos;

    act(() => {
      result.current.deleteTodo("no-such-id");
    });

    expect(result.current.todos).toEqual(before);
  });

  it("toggle과 delete 결과가 localStorage에도 반영된다", async () => {
    const { result } = renderHook(() => useTodos());
    const [aId, bId] = addThree(result);

    act(() => {
      result.current.toggleTodo(aId);
      result.current.deleteTodo(bId);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "[]") as {
        id: string;
        completed: boolean;
      }[];
      expect(stored.some((t) => t.id === bId)).toBe(false);
      expect(stored.find((t) => t.id === aId)?.completed).toBe(true);
    });
  });
});

describe("useTodos 편집", () => {
  it("editTodo는 지정한 id의 text만 변경한다", () => {
    const { result } = renderHook(() => useTodos());
    act(() => {
      result.current.addTodo("원본");
    });
    const id = result.current.todos[0].id;

    act(() => {
      result.current.editTodo(id, "수정됨");
    });

    expect(result.current.todos[0]).toMatchObject({ id, text: "수정됨" });
  });

  it("빈 문자열로 editTodo를 호출하면 해당 항목이 삭제된다", () => {
    const { result } = renderHook(() => useTodos());
    act(() => {
      result.current.addTodo("삭제될 항목");
      result.current.addTodo("남을 항목");
    });
    const [remainingId, toDeleteId] = result.current.todos.map((t) => t.id);

    act(() => {
      result.current.editTodo(toDeleteId, "   ");
    });

    expect(result.current.todos.map((t) => t.id)).toEqual([remainingId]);
  });

  it("빈 문자열 편집으로 삭제된 결과가 localStorage에도 반영된다", async () => {
    const { result } = renderHook(() => useTodos());
    act(() => {
      result.current.addTodo("삭제될 항목");
    });
    const id = result.current.todos[0].id;

    act(() => {
      result.current.editTodo(id, "");
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "[]");
      expect(stored).toEqual([]);
    });
  });
});

describe("useTodos 손상 데이터 보호", () => {
  it("파싱할 수 없는 저장값을 빈 배열로 덮어쓰지 않는다", async () => {
    localStorage.setItem("todos", "{이건 JSON이 아님");

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toEqual([]);
    // 손상된 원본이 보존돼 복구 여지가 남아야 한다
    expect(localStorage.getItem("todos")).toBe("{이건 JSON이 아님");
  });

  it("배열이 아닌 저장값도 덮어쓰지 않는다", async () => {
    localStorage.setItem("todos", JSON.stringify({ x: 1 }));

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toEqual([]);
    expect(localStorage.getItem("todos")).toBe('{"x":1}');
  });

  it("손상 데이터 로드 후 새 항목을 추가하면 정상적으로 저장된다", async () => {
    localStorage.setItem("todos", "{이건 JSON이 아님");

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.addTodo("새 할 일");
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "null");
      expect(Array.isArray(stored)).toBe(true);
      expect(stored[0]?.text).toBe("새 할 일");
    });
  });
});
