import * as React from 'react';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';

import { TextField, TextFieldProps, TextFieldHTMLProps } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

import classNames from 'classnames';

interface TextAreaProps extends React.HTMLProps<HTMLTextAreaElement> {
  value?: string;
  update: (data: string) => void;
}

export class TextArea extends React.PureComponent<TextAreaProps> {
  handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const { update } = this.props;
    update(e.target.value)
  }

  render() {
    const { update, ...other } = this.props;
    return <textarea className="form-control" onChange={this.handleChange.bind(this)} {...other} />;
  }
}

interface TextInputProps extends TextFieldHTMLProps {
  value?: string;
  update: (data: string) => void;
  type?: never;
}

export class TextInput extends React.PureComponent<TextInputProps> {
  handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { update } = this.props;
    update(e.target.value)
  }

  render() {
    const { update, ...other} = this.props;
    return <TextField outlined onChange={this.handleChange.bind(this)} {...other} />
  }
}

interface NumberInputProps extends TextFieldProps {
  value?: number;
  update: (data: number) => void;
  type?: never;
}

interface NumberInputState {
  str: string | null;
}

export class NumberInput extends React.PureComponent<NumberInputProps,NumberInputState> {
  constructor(props: NumberInputProps) {
    super(props);

    this.state = {
      str: null,
    };
  }

  handleFocus() {
    const { value } = this.props;

    this.setState({
      str: String(value),
    });
  }

  handleBlur() {
    this.setState({
      str: null,
    });
  }

  handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { update } = this.props;
    const str = e.target.value;
    update(Number(str));
    this.setState({str});
  }

  render() {
    const {update, value, ...other} = this.props
    const { str } = this.state;

    const str_value = str == null ? value : str;

    return <TextField value={str_value} onBlur={this.handleBlur.bind(this)} onFocus={this.handleFocus.bind(this)} type="number" onChange={this.handleChange.bind(this)} {...other} />
  }
}

interface BooleanCheckboxProps extends Omit<React.HTMLProps<HTMLInputElement>,"value"> {
  value?: boolean;
  update: (data: boolean) => void;
  type?: never;
}

export class BooleanCheckbox extends React.PureComponent<BooleanCheckboxProps> {
  handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { update } = this.props;
    update(e.target.checked)
  }

  render() {
    const { update, value, ...other} = this.props;
    return <input type="checkbox" checked={value} onChange={this.handleChange.bind(this)} {...other} />
  }
}

interface SimpleButtonProps extends React.HTMLProps<HTMLButtonElement> {
  clicked: () => void;
  type?: never;
  onClick?: never;
}

export const SimpleButton: React.SFC<SimpleButtonProps> = ({ clicked, ...other }) => {
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    clicked();
  }

  return <Button {...other} type="button" onClick={onClick} />
}

function isMissingValue(needle: string | undefined, children: React.ReactNode[]): boolean {
  if(needle == null) {
    return false;
  }

  return !children.some((child: React.ReactNode) => {
    if(Array.isArray(child)) {
      return isMissingValue(needle, child);
    }

    if(!React.isValidElement(child) || child.type !== "option") {
      return false;
    }

    const { value, children } = child.props;

    if(value != null) {
      return value === needle;
    } else {
      return children === needle;
    }
  });
}

function findFirstOption(children: React.ReactNode[]): string | undefined {
  for(const child of children) {
    if(Array.isArray(child)) {
      const found = findFirstOption(child);

      if(found != null) {
        return found;
      } else {
        continue;
      }
    }

    if(!React.isValidElement(child) || child.type !== "option") {
      continue;
    }

    const { value, children } = child.props;

    if(value != null) {
      return value;
    } else if(typeof children === "string") {
      return children;
    } else {
      console.log("Unable to determine value of option");
    }
  }

  return;
}

interface SmartSelectProps extends React.HTMLProps<HTMLSelectElement> {
  value?: string;
  update: (data: string) => void;
  onChange?: never;
}

interface SmartSelectState {
  missing?: string;
}

export class SmartSelect extends React.PureComponent<SmartSelectProps,SmartSelectState> {
  constructor(props: SmartSelectProps) {
    super(props);

    const { value, children } = props;

    const missing_value = isMissingValue(value, React.Children.toArray(children));

    this.state = {
      missing: missing_value ? props.value : undefined,
    }
  }

  handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { update } = this.props;
    update(e.target.value);
  }

  render(): React.ReactNode {
    const { children, update, ...other } = this.props;
    const { missing } = this.state;

    let missing_option: React.ReactNode = null;

    if(missing != null) {
      missing_option = <option>{missing}</option>;
    }

    return <select onChange={this.handleChange.bind(this)} {...other}>
      {missing_option}
      {children}
    </select>
  }
}
