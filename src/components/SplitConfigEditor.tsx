import React, { useEffect, useRef, useState, ReactElement } from "react";
import Editor, { useMonaco, Monaco } from "@monaco-editor/react";
import { editor, Uri } from "monaco-editor";
import { TiDelete } from "react-icons/ti";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import SplitConfigSchema from "../schema/splits.schema";
import { Config } from "../lib/lss";
import { parseSplitsDefinitions } from "../lib/hollowknight-splits";
import SplitSelect, { SplitOption } from "./SplitSelect";
import "react-tabs/style/react-tabs.css";

interface Props {
  defaultValue: string;
  onChange: (value: string | undefined) => void;
}

const { $id: schemaId, } = SplitConfigSchema;

const modelUri = Uri.parse(schemaId);
function handleEditorWillMount(monaco: Monaco) {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [{
      uri: schemaId,
      fileMatch: [modelUri.toString()],
      schema: SplitConfigSchema,
    }],
  });
}

const splitDefinitions = parseSplitsDefinitions();
function getSplitOption(splitId: string) {
  // todo: consolidate with other similar functions
  const split = splitDefinitions.get(splitId);
  if (!split) {
    return undefined;
  }
  return {
    value: split.id,
    label: split.description,
    tooltip: split.tooltip,
  };
}

export default function SplitConfigEditor(props: Props): ReactElement {
  const monaco = useMonaco();
  useEffect(() => {
    if (monaco) {
      handleEditorWillMount(monaco);
    }
  }, [monaco]);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance;
  };

  const [splitConfig, setSplitConfig] = useState(props.defaultValue);
  const onChange = (value: string | undefined) => {
    if (value) {
      setSplitConfig(value);
      props.onChange(value);
    }
  };

  useEffect(() => {
    // lol wut
    setSplitConfig(props.defaultValue);
  }, [props.defaultValue]);

  const onChangeSplitSelect = (split: SplitOption | null) => {
    if (!split || !editorRef?.current) {
      return;
    }
    const currentValue = editorRef.current.getValue();
    if (!currentValue) {
      console.error("Could not get value from editorRef");
      return;
    }
    try {
      const currentConfig = JSON.parse(currentValue) as Config;
      currentConfig.splitIds.push(split.value);
      editorRef.current.setValue(JSON.stringify(currentConfig, null, 4) + "\n");
    }
    catch (e) {
      console.error("Failed to parse config from editor:", e);
    }
  };

  let parsedConfig: Partial<Config> = {};
  try {
    parsedConfig = JSON.parse(splitConfig) as Config;
  }
  catch (e) {
    console.error(e);
  }

  return (
    <Tabs>
      <TabList>
        <Tab>JSON</Tab>
        <Tab>UI (Beta)</Tab>
      </TabList>

      <TabPanel>
        <SplitSelect
          onChange={onChangeSplitSelect}
        />
        <div className="hk-split-maker-monaco-editor">
          <Editor
            defaultLanguage="json"
            defaultValue={props.defaultValue}
            value={splitConfig}
            onChange={onChange}
            theme="vs-dark"
            options={({
              minimap: {
                enabled: false,
              },
            })}
            path={modelUri.toString()}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
          />
        </div>
      </TabPanel>
      <TabPanel>
        {parsedConfig.splitIds &&
          <ul>
            {parsedConfig.splitIds.map((splitId, index) =>
              <div key={index} style={{
                display: "flex",
                alignItems: "center",
              }}>
                <SplitSelect value={getSplitOption(splitId)} onChange={val => {
                  if (!parsedConfig.splitIds || !val) {
                    return;
                  }
                  const newConfig = {
                    ...parsedConfig,
                    splitIds: [
                      ...parsedConfig.splitIds.slice(0, index),
                      val.value,
                      ...parsedConfig.splitIds.slice(index + 1)
                    ],
                  };
                  onChange(JSON.stringify(newConfig, null, 4));
                }} />
                <TiDelete size="1.5em" style={{ cursor: "pointer", }}onClick={() => {
                  if (!parsedConfig.splitIds) {
                    return;
                  }
                  const newConfig = {
                    ...parsedConfig,
                    splitIds: [
                      ...parsedConfig.splitIds.slice(0, index),
                      ...parsedConfig.splitIds.slice(index + 1)
                    ],
                  };
                  onChange(JSON.stringify(newConfig, null, 4));
                }} />
              </div>
            )}
          </ul>
        }
      </TabPanel>
    </Tabs>
  );
}
