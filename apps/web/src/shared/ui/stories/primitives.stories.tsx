import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  AnimatedListItem,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogWindow,
  Input,
  Label,
  Segmented,
  Select,
  Skeleton,
  Textarea,
  staggerDelayMs,
} from "@/shared/ui";

const meta: Meta = {
  title: "Примитивы/Обзор",
};

export default meta;

export const Кнопки: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["default", "secondary", "field", "ghost", "danger", "link"] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-3">
          <code className="w-20 text-xs text-muted-foreground">{variant}</code>
          <Button variant={variant}>Кнопка</Button>
          <Button variant={variant} size="sm">
            Малая
          </Button>
          <Button variant={variant} disabled>
            Недоступна
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <code className="w-20 text-xs text-muted-foreground">icon</code>
        <Button size="icon" variant="field">
          ✓
        </Button>
        <Button size="icon-sm" variant="ghost">
          ✕
        </Button>
      </div>
    </div>
  ),
};

export const ПоляВвода: StoryObj = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-input">Название</Label>
        <Input id="story-input" placeholder="Задача на завтра" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-input-prefix" required>
          Сумма
        </Label>
        <Input id="story-input-prefix" prefix="₽" placeholder="0" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-input-invalid">С ошибкой</Label>
        <Input id="story-input-invalid" aria-invalid placeholder="некорректно" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-select">Список</Label>
        <Select id="story-select">
          <option>Inbox</option>
          <option>Работа</option>
          <option>Дом</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="story-textarea">Заметка</Label>
        <Textarea id="story-textarea" placeholder="Детали задачи…" />
      </div>
    </div>
  ),
};

export const ЧекбоксыИБейджи: StoryObj = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          {(["sm", "md", "lg"] as const).map((size) => (
            <Checkbox
              key={size}
              size={size}
              checked={checked}
              onCheckedChange={setChecked}
              aria-label={`Чекбокс ${size}`}
            />
          ))}
          <Checkbox checked={false} onCheckedChange={() => undefined} aria-label="Пустой" />
          <Checkbox checked disabled aria-label="Недоступный отмеченный" />
        </div>
        <div className="flex items-center gap-3">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
        </div>
      </div>
    );
  },
};

export const Сегменты: StoryObj = {
  render: () => {
    const [value, setValue] = useState("all");
    return (
      <Segmented
        value={value}
        onChange={setValue}
        options={[
          { value: "all", label: "Все" },
          { value: "active", label: "Активные" },
          { value: "done", label: "Завершённые" },
        ]}
      />
    );
  },
};

export const КарточкаИСкелетон: StoryObj = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Задача</CardTitle>
          <CardDescription>Карточка поверхности surface-raised</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    </div>
  ),
};

export const Диалог: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="flex flex-col gap-4">
        <Button onClick={() => setOpen(true)}>Открыть диалог</Button>
        <p className="text-sm text-muted-foreground">
          Desktop — по центру, мобильный (≤719px) — листом снизу.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogWindow className="sm:w-100">
            <DialogHeader>
              <DialogTitle>Удалить задачу?</DialogTitle>
              <DialogDescription>Действие нельзя отменить.</DialogDescription>
            </DialogHeader>
            <DialogContent>
              <p className="text-sm">Задача будет удалена безвозвратно.</p>
            </DialogContent>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button variant="danger" onClick={() => setOpen(false)}>
                Удалить
              </Button>
            </DialogFooter>
          </DialogWindow>
        </Dialog>
      </div>
    );
  },
};

export const АнимированныйСписок: StoryObj = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-2">
      {["Первая задача", "Вторая задача", "Третья задача", "Четвёртая задача", "Пятая задача"].map(
        (item, index) => (
          <AnimatedListItem key={item} delayMs={staggerDelayMs(index)}>
            <div className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm">
              {item}
            </div>
          </AnimatedListItem>
        ),
      )}
    </div>
  ),
};
