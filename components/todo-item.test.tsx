import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "@/lib/types";
import { TodoItem } from "@/components/todo-item";

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "1",
    text: "테스트 할 일",
    completed: false,
    priority: "medium",
    createdAt: 0,
    ...overrides,
  };
}

describe("TodoItem", () => {
  it("할 일 텍스트를 렌더링한다", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("테스트 할 일")).toBeInTheDocument();
  });

  it("체크박스를 클릭하면 해당 id로 onToggle을 호출한다", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TodoItem
        todo={makeTodo({ id: "abc" })}
        onToggle={onToggle}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    await user.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("삭제 버튼을 클릭하면 해당 id로 onDelete를 호출한다", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TodoItem
        todo={makeTodo({ id: "abc" })}
        onToggle={vi.fn()}
        onDelete={onDelete}
        onEdit={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(onDelete).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("우선순위 라벨을 뱃지로 표시한다", () => {
    render(
      <TodoItem
        todo={makeTodo({ priority: "high" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("높음")).toBeInTheDocument();
  });

  it("완료된 할 일은 취소선 스타일을 가진다", () => {
    render(
      <TodoItem
        todo={makeTodo({ completed: true })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("테스트 할 일")).toHaveClass("line-through");
  });

  it("마감일이 있으면 마감일을 표시한다", () => {
    render(
      <TodoItem
        todo={makeTodo({ dueDate: "2026-07-01" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("마감일이 없으면 마감일을 표시하지 않는다", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.queryByText("2026-07-01")).not.toBeInTheDocument();
  });

  it("카테고리가 있으면 태그를 표시한다", () => {
    render(
      <TodoItem
        todo={makeTodo({ category: "work" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("업무")).toBeInTheDocument();
  });

  it("카테고리가 없으면 태그를 표시하지 않는다", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.queryByText("업무")).not.toBeInTheDocument();
    expect(screen.queryByText("개인")).not.toBeInTheDocument();
    expect(screen.queryByText("쇼핑")).not.toBeInTheDocument();
  });
});

describe("TodoItem 편집 - 진입/취소/커밋", () => {
  it("더블클릭하면 편집 모드로 진입하고 입력값에 기존 텍스트가 채워진다", async () => {
    const user = userEvent.setup();
    render(
      <TodoItem
        todo={makeTodo({ text: "원본 텍스트" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    await user.dblClick(screen.getByText("원본 텍스트"));

    expect(screen.getByRole("textbox", { name: "할 일 편집" })).toHaveValue(
      "원본 텍스트"
    );
  });

  it("Escape로 취소하면 draft가 원래 텍스트로 되돌아가고 onEdit은 호출되지 않는다", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TodoItem
        todo={makeTodo({ text: "원본 텍스트" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.dblClick(screen.getByText("원본 텍스트"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    fireEvent.change(input, { target: { value: "변경중" } });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("원본 텍스트")).toBeInTheDocument();

    // 다시 편집 모드로 들어가도 draft가 원본으로 초기화돼 있어야 한다
    await user.dblClick(screen.getByText("원본 텍스트"));
    expect(screen.getByRole("textbox", { name: "할 일 편집" })).toHaveValue(
      "원본 텍스트"
    );
  });

  it("입력값을 바꾸고 포커스를 벗어나면(blur) onEdit이 호출된다", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TodoItem
        todo={makeTodo({ id: "abc", text: "원본 텍스트" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.dblClick(screen.getByText("원본 텍스트"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    fireEvent.change(input, { target: { value: "블러로 저장" } });

    fireEvent.blur(input);

    expect(onEdit).toHaveBeenCalledExactlyOnceWith("abc", "블러로 저장");
  });
});

describe("TodoItem 편집 - IME 조합 중 Enter", () => {
  it("IME 조합 확정용 Enter(isComposing=true)는 편집을 커밋하지 않는다", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.dblClick(screen.getByText("테스트 할 일"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    fireEvent.change(input, { target: { value: "수정중" } });

    // 한글 마지막 글자 조합을 확정하려고 누른 Enter (isComposing=true)
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(onEdit).not.toHaveBeenCalled();
    // 여전히 편집 모드여야 한다
    expect(
      screen.getByRole("textbox", { name: "할 일 편집" })
    ).toBeInTheDocument();
  });

  it("조합이 끝난 일반 Enter는 정상적으로 커밋한다", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.dblClick(screen.getByText("테스트 할 일"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    fireEvent.change(input, { target: { value: "수정완료" } });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(onEdit).toHaveBeenCalledExactlyOnceWith("1", "수정완료");
  });
});
