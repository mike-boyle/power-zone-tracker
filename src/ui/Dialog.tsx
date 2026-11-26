import { createEffect, type JSX } from 'solid-js';
import styles from './Dialog.module.css';

/**
 * A modal built on the native <dialog> element, which handles focus trapping,
 * Escape to close and the backdrop.
 */
export function Dialog(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: JSX.Element;
  actions: JSX.Element;
}) {
  let ref: HTMLDialogElement | undefined;

  createEffect(() => {
    if (!ref) return;
    if (props.open && !ref.open) ref.showModal();
    if (!props.open && ref.open) ref.close();
  });

  return (
    <dialog
      ref={ref}
      class={styles.dialog}
      onClose={() => props.onClose()}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) dismisses it.
        if (e.target === ref) props.onClose();
      }}
    >
      <div class={styles.body}>
        <h2 class={styles.title}>{props.title}</h2>
        {props.children && <div class={styles.content}>{props.children}</div>}
        <div class={styles.actions}>{props.actions}</div>
      </div>
    </dialog>
  );
}
