import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button, TextInput, Textarea } from 'shadcn-ui';

const MCPToolGenerator = () => {
    const { control, handleSubmit } = useForm();

    const onSubmit = (data) => {
        console.log(data);
        // Generate MCP JSON schema here
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Controller name="toolName" control={control} render={({ field }) => (<TextInput {...field} placeholder="Tool Name" />)} />
            <Controller name="toolDescription" control={control} render={({ field }) => (<Textarea {...field} placeholder="Tool Description" />)} />
            <Controller name="functionName" control={control} render={({ field }) => (<TextInput {...field} placeholder="Function Name" />)} />
            <Controller name="functionDescription" control={control} render={({ field }) => (<Textarea {...field} placeholder="Function Description" />)} />
            {/* Dynamic fields for input/output schema and types go here */}
            <Button type="submit">Generate MCP JSON Schema</Button>
        </form>
    );
};

export default MCPToolGenerator;